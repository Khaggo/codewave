import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity, selectOptionContaining } from '../helpers/assertions.mjs';
import { apiLogin, ensureLocalQaRuntime, listCustomerBookings, listVehicleJobOrders } from '../helpers/api.mjs';
import { qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import { verifyInvoiceLookup } from '../helpers/flows.mjs';

const backendRequire = createRequire(path.resolve('backend/package.json'));
const { Pool } = backendRequire('pg');
const bcrypt = backendRequire('bcrypt');

const superAdminAccount = {
  email: process.env.QA_SUPER_ADMIN_EMAIL ?? 'qa.ecommerce.superadmin@autocare.com',
  password: process.env.QA_SUPER_ADMIN_PASSWORD ?? 'Password1.',
};

function loadBackendEnv() {
  for (const envPath of [path.resolve('backend/.env.example'), path.resolve('backend/.env')]) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const contents = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      process.env[key] ??= value;
    }
  }
}

function uniqueQaToken(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(8, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function mainApiUrl(pathname) {
  return `${runtimeConfig.apiBaseUrl}${pathname}`;
}

function ecommerceApiUrl(pathname) {
  return `${runtimeConfig.ecommerceApiBaseUrl}${pathname}`;
}

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(
    response.ok(),
    `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`,
  ).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function mainPost(request, pathname, accessToken, payload, contextLabel) {
  return expectJson(
    await request.post(mainApiUrl(pathname), {
      headers: authHeaders(accessToken),
      data: payload,
    }),
    contextLabel,
  );
}

async function ecommerceGet(request, pathname, accessToken, contextLabel) {
  return expectJson(
    await request.get(ecommerceApiUrl(pathname), {
      headers: accessToken ? authHeaders(accessToken) : undefined,
    }),
    contextLabel,
  );
}

async function ecommercePost(request, pathname, accessToken, payload, contextLabel) {
  return expectJson(
    await request.post(ecommerceApiUrl(pathname), {
      headers: accessToken ? authHeaders(accessToken) : undefined,
      data: payload,
    }),
    contextLabel,
  );
}

async function ecommerceDelete(request, pathname, accessToken, contextLabel) {
  return expectJson(
    await request.delete(ecommerceApiUrl(pathname), {
      headers: accessToken ? authHeaders(accessToken) : undefined,
    }),
    contextLabel,
  );
}

async function ensureEcommerceQaRuntime(request) {
  const response = await request.get(ecommerceApiUrl('/api/health'));
  const body = await expectJson(response, 'Ecommerce service health check');

  expect(body).toEqual(expect.objectContaining({ service: 'ecommerce-service', status: 'ok' }));
}

async function seedSuperAdminQaAccount() {
  loadBackendEnv();
  const databaseUrl = process.env.DATABASE_URL;

  expect(databaseUrl, 'DATABASE_URL is required to seed the QA super-admin account.').toBeTruthy();

  const pool = new Pool({ connectionString: databaseUrl });
  const passwordHash = await bcrypt.hash(superAdminAccount.password, 10);

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query(
        `
          INSERT INTO users (email, role, staff_code, is_active, deleted_email, deleted_at)
          VALUES ($1, 'super_admin', 'QA-CRUD-SUPER', true, null, null)
          ON CONFLICT (email)
          DO UPDATE SET
            role = 'super_admin',
            staff_code = 'QA-CRUD-SUPER',
            is_active = true,
            deleted_email = null,
            deleted_at = null,
            updated_at = now()
          RETURNING id, email
        `,
        [superAdminAccount.email],
      );
      const user = userResult.rows[0];

      await client.query(
        `
          INSERT INTO user_profiles (user_id, first_name, last_name, phone)
          VALUES ($1, 'QA', 'Admin CRUD', '+639170009998')
          ON CONFLICT (user_id)
          DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            updated_at = now()
        `,
        [user.id],
      );

      await client.query(
        `
          INSERT INTO auth_accounts (user_id, password_hash, is_active)
          VALUES ($1, $2, true)
          ON CONFLICT (user_id)
          DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            is_active = true,
            updated_at = now()
        `,
        [user.id, passwordHash],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function loginOrSeedSuperAdmin(request) {
  const firstAttempt = await request.post(mainApiUrl('/api/auth/login'), {
    data: superAdminAccount,
  });

  if (firstAttempt.ok()) {
    return expectJson(firstAttempt, `Login for ${superAdminAccount.email}`);
  }

  await seedSuperAdminQaAccount();
  return apiLogin(request, superAdminAccount);
}

async function loginStaffForHeading(page, account, startPath, headingPattern) {
  await page.goto(`${runtimeConfig.staffBaseUrl}${startPath}`);
  await page.getByPlaceholder('email@example.com').fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: headingPattern }).waitFor();
}

function fieldWithinLabel(scope, labelText, selector = 'input') {
  return scope.locator('label').filter({ hasText: labelText }).locator(selector).first();
}

function cardPanel(scope, titleText) {
  return scope.getByText(titleText, { exact: true }).locator('xpath=ancestor::div[1]');
}

function rawUuidPattern() {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
}

async function findFinalizedServiceJobOrder(request, customerSession, adviserSession) {
  const bookings = await listCustomerBookings(request, customerSession);
  const vehicleIds = [...new Set(bookings.map((booking) => booking?.vehicleId).filter(Boolean))];

  for (const vehicleId of vehicleIds) {
    const jobOrders = await listVehicleJobOrders(request, adviserSession, vehicleId);
    const finalized = jobOrders.find(
      (jobOrder) =>
        jobOrder?.status === 'finalized' &&
        jobOrder?.customerUserId === customerSession.user.id &&
        jobOrder?.vehicleId === vehicleId,
    );

    if (finalized) {
      return finalized;
    }
  }

  return null;
}

async function clearCustomerCart(request, customerSession) {
  const cart = await ecommerceGet(
    request,
    `/api/cart?customerUserId=${encodeURIComponent(customerSession.user.id)}`,
    customerSession.accessToken,
    'Load customer cart before admin CRUD billing QA',
  );

  for (const item of cart.items ?? []) {
    await ecommerceDelete(
      request,
      `/api/cart/items/${encodeURIComponent(item.id)}?customerUserId=${encodeURIComponent(customerSession.user.id)}`,
      customerSession.accessToken,
      `Remove stale cart item ${item.id}`,
    );
  }
}

async function createApiBackedEcommerceOrder(request, customerSession, { product, runMarker }) {
  await clearCustomerCart(request, customerSession);
  await ecommercePost(
    request,
    '/api/cart/items',
    customerSession.accessToken,
    {
      customerUserId: customerSession.user.id,
      productId: product.id,
      quantity: 1,
    },
    'Add admin CRUD QA product to cart',
  );

  return ecommercePost(
    request,
    '/api/checkout/invoice',
    customerSession.accessToken,
    {
      customerUserId: customerSession.user.id,
      billingAddress: {
        recipientName: 'Queue Customer',
        email: qaAccounts.customer.email,
        contactPhone: '+639170000101',
        addressLine1: '123 QA Admin CRUD Street',
        addressLine2: 'Billing proof',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100',
      },
      notes: `Admin CRUD billing proof ${runMarker}`,
    },
    'Create ecommerce order for admin CRUD billing QA',
  );
}

async function verifyStaffInvoiceSurface(page, { customerEmail, orderNumber, invoiceNumber, expectedStatus }) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/invoices`);
  await page.getByRole('heading', { name: 'Invoices & Orders' }).waitFor();
  await page.getByRole('button', { name: 'Order Invoices' }).click();
  const customerSelect = page.getByRole('combobox', { name: 'Customer' });
  await selectOptionContaining(customerSelect, customerEmail);
  const orderSelect = page.getByRole('combobox', { name: 'Order record' });
  await selectOptionContaining(orderSelect, orderNumber);
  await page.getByRole('button', { name: 'Load Order' }).click();
  await expect(page.getByText(`${orderNumber} is available`, { exact: false })).toBeVisible();
  await expect(page.getByText(invoiceNumber, { exact: true })).toBeVisible();
  await expect(page.getByText(expectedStatus, { exact: true }).first()).toBeVisible();
}

async function recordManualEcommercePaymentFromStaffUi(page, { invoiceNumber, amountCents }) {
  const amountPhp = amountCents / 100;
  expect(Number.isInteger(amountPhp), 'Manual ecommerce payment UI accepts whole PHP amounts in this QA setup.').toBeTruthy();

  const reference = `QA-CRUD-${invoiceNumber}`.slice(0, 120);
  await expect(page.getByText('Manual ecommerce payment', { exact: true })).toBeVisible();
  await page.getByLabel('Payment amount (PHP)').fill(String(amountPhp));
  await page.getByLabel('Payment method').selectOption('cash');
  await page.getByLabel('Reference').fill(reference);
  await page.getByLabel('Notes').fill('Playwright admin CRUD billing payment through staff UI.');
  await page.getByRole('button', { name: /Record Ecommerce Payment/i }).click();
  await expect(page.getByText(reference, { exact: false })).toBeVisible();

  return reference;
}

test.describe('AUTOCARE Admin CRUD / pricing / billing QA', () => {
  test('admin business-entry modules and invoice surfaces support CRUD, pricing, billing, and clear states', async ({
    page,
    request,
  }, testInfo) => {
    annotateSeverity(
      testInfo,
      'critical',
      'Panel feedback called out admin data-entry, service pricing, and billing clarity, so this run checks staff/admin CRUD plus service and ecommerce invoice surfaces.',
    );

    await ensureLocalQaRuntime(request);
    await ensureEcommerceQaRuntime(request);

    const runMarker = uniqueQaToken('ADMINCRUD');
    const superAdminSession = await loginOrSeedSuperAdmin(request);
    const adviserSession = await apiLogin(request, qaAccounts.adviser);
    const customerSession = await apiLogin(request, qaAccounts.customer);

    const catalogCategoryName = `QA Admin Catalog ${runMarker}`;
    const catalogProductName = `QA Admin Catalog Product ${runMarker}`;
    const catalogProductUpdatedName = `QA Admin Catalog Product Edited ${runMarker}`;
    const catalogSku = `QA-CAT-${runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`.slice(0, 72);
    const inventoryProductName = `QA Inventory Item ${runMarker}`;
    const inventorySku = `QA-INV-${runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`.slice(0, 72);
    const serviceCategoryName = `QA Service Category ${runMarker}`;
    const serviceName = `QA Service Pricing Gap ${runMarker}`;
    const inactiveServiceName = `QA Inactive Service ${runMarker}`;
    const rewardName = `QA Admin Reward ${runMarker}`;
    const ruleName = `QA Admin Rule ${runMarker}`;

    let inventoryProduct = null;

    await test.step('Catalog Admin creates, edits, and archives a product from staff web', async () => {
      await loginStaffForHeading(page, superAdminAccount, '/admin/catalog', /Catalog Admin/i);

      const publishingSection = page.locator('section').filter({ hasText: 'Publishing Controls' }).first();
      await fieldWithinLabel(publishingSection, 'New Category Name').fill(catalogCategoryName);

      const categoryResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/product-categories'),
        { timeout: 30_000 },
      );
      await publishingSection.getByRole('button', { name: /Add Category/i }).click();
      const category = await expectJson(await categoryResponsePromise, 'Create catalog category from staff UI');
      expect(category.name).toBe(catalogCategoryName);

      const productForm = publishingSection.locator('form').filter({ hasText: 'Product Name' }).first();
      await expect(productForm.locator('select option').filter({ hasText: catalogCategoryName })).toHaveCount(1);
      await fieldWithinLabel(productForm, 'Product Name').fill(catalogProductName);
      await fieldWithinLabel(productForm, 'Category', 'select').selectOption({ label: catalogCategoryName });
      await fieldWithinLabel(productForm, 'Price').fill('1299');
      await fieldWithinLabel(productForm, 'SKU (required)').fill(catalogSku);
      await fieldWithinLabel(productForm, 'Description', 'textarea').fill('QA-created product for admin CRUD coverage.');

      const productResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/products'),
        { timeout: 30_000 },
      );
      await productForm.getByRole('button', { name: /Publish Product/i }).click();
      const product = await expectJson(await productResponsePromise, 'Create catalog product from staff UI');
      expect(product.sku).toBe(catalogSku);

      await page.getByPlaceholder('Search by name, category, SKU, or description').fill(catalogSku);
      let productRow = page.locator('table[aria-label="Published products"] tbody tr').filter({ hasText: catalogSku }).first();
      await expect(productRow.getByText(catalogProductName, { exact: true })).toBeVisible();
      await expect(productRow.getByText('Published', { exact: true })).toBeVisible();

      await productRow.getByRole('button', { name: 'Edit' }).click();
      const editor = page.locator('.fixed.inset-0.z-50').filter({ hasText: 'Edit Product' }).first();
      await expect(editor.getByText('Edit Product', { exact: true })).toBeVisible();
      await fieldWithinLabel(editor, 'Product Name').fill(catalogProductUpdatedName);
      await fieldWithinLabel(editor, 'Price').fill('1399');

      const editResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'PATCH' && response.url().includes(`/api/products/${product.id}`),
        { timeout: 30_000 },
      );
      await editor.getByRole('button', { name: /Save Changes/i }).click();
      const updatedProduct = await expectJson(await editResponsePromise, 'Edit catalog product from staff UI');
      expect(updatedProduct.name).toBe(catalogProductUpdatedName);
      await expect(page.getByText(catalogProductUpdatedName, { exact: true })).toBeVisible();

      const archiveResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'PATCH' && response.url().includes(`/api/products/${product.id}`),
        { timeout: 30_000 },
      );
      await editor.getByRole('button', { name: /Archive Product/i }).click();
      await expectJson(await archiveResponsePromise, 'Archive catalog product from staff UI');
      const archivedProductRow = page.locator('table[aria-label="Published products"] tbody tr').filter({ hasText: catalogSku }).first();
      await expect(archivedProductRow.getByText('Hidden', { exact: true })).toBeVisible();
      const archivedProductActions = await archivedProductRow.locator('td').last().innerText();
      if (!/Republish/i.test(archivedProductActions) || /\bArchive\b/i.test(archivedProductActions)) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Catalog product archive does not expose a clear recovery state; hidden products should show Republish instead of a repeated Archive action.',
        });
      }

      const categoryManagementText = await publishingSection.innerText();
      if (!/(Edit|Archive|Deactivate)\s+Category/i.test(categoryManagementText)) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Catalog Admin can create categories, but the staff UI does not expose category edit/archive/deactivate actions even though the flow expects category CRUD behavior.',
        });
      }
    });

    await test.step('Inventory creates stock-backed product and updates quantity plus thresholds', async () => {
      await page.goto(`${runtimeConfig.staffBaseUrl}/admin/inventory`);
      await page.getByRole('heading', { name: /Inventory/i }).waitFor();

      const inventorySection = page.locator('section').filter({ hasText: 'Inventory Control Center' }).first();
      const createPanel = cardPanel(inventorySection, 'Create inventory item');
      await fieldWithinLabel(createPanel, 'Category', 'select').selectOption({ label: catalogCategoryName });
      await fieldWithinLabel(createPanel, 'SKU').fill(inventorySku);
      await fieldWithinLabel(createPanel, 'Product name').fill(inventoryProductName);
      await fieldWithinLabel(createPanel, 'Description', 'textarea').fill('Stock-backed QA item for admin CRUD billing proof.');
      await fieldWithinLabel(createPanel, 'Price (PHP)').fill('880');
      const openingQuantityInput = fieldWithinLabel(createPanel, 'Opening quantity');
      const createThresholdInput = fieldWithinLabel(createPanel, 'Low-stock threshold');
      await openingQuantityInput.fill('5');
      await createThresholdInput.fill('3');
      await expect(openingQuantityInput).toHaveValue('5');
      await expect(createThresholdInput).toHaveValue('3');

      const createInventoryResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/products'),
        { timeout: 30_000 },
      );
      await createPanel.getByRole('button', { name: /Create inventory item/i }).click();
      inventoryProduct = await expectJson(await createInventoryResponsePromise, 'Create inventory-backed product from staff UI');
      expect(inventoryProduct.sku).toBe(inventorySku);
      expect(inventoryProduct.quantityOnHand).toBe(5);
      expect(inventoryProduct.reorderThreshold).toBe(3);

      const stockActions = cardPanel(inventorySection, 'Stock actions');
      await fieldWithinLabel(stockActions, 'Selected product', 'select').selectOption(inventoryProduct.id);
      const quantityOnHandInput = fieldWithinLabel(stockActions, 'Quantity on hand');
      const reorderThresholdInput = fieldWithinLabel(stockActions, 'Low-stock threshold');
      await expect(quantityOnHandInput).toHaveValue('5');
      await expect(reorderThresholdInput).toHaveValue('3');
      await quantityOnHandInput.fill('7');
      await reorderThresholdInput.fill('6');

      const policyResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          response.url().includes(`/api/inventory/products/${inventoryProduct.id}/policy`),
        { timeout: 30_000 },
      );
      await stockActions.getByRole('button', { name: /Save stock policy/i }).click();
      const policyProduct = await expectJson(await policyResponsePromise, 'Update inventory stock policy from staff UI');
      expect(policyProduct.quantityOnHand).toBe(7);
      if (policyProduct.reorderThreshold !== 6) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            `Inventory stock policy did not persist the edited low-stock threshold. QA entered threshold 6, but the saved product response still returned ${policyProduct.reorderThreshold}.`,
        });
      }

      await fieldWithinLabel(stockActions, 'Quantity delta').fill('-2');
      await fieldWithinLabel(stockActions, 'Reason').fill('QA cycle count adjustment.');
      const adjustmentResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes(`/api/inventory/products/${inventoryProduct.id}/adjustments`),
        { timeout: 30_000 },
      );
      await stockActions.getByRole('button', { name: /Save stock adjustment/i }).click();
      const adjustedProduct = await expectJson(await adjustmentResponsePromise, 'Record inventory stock adjustment from staff UI');
      expect(adjustedProduct.quantityOnHand).toBe(5);

      const inventoryRow = page.locator('table[aria-label="Inventory product table"] tbody tr').filter({ hasText: inventorySku }).first();
      await expect(inventoryRow.getByText(inventoryProductName, { exact: true })).toBeVisible();
      if (adjustedProduct.reorderThreshold === 6) {
        await expect(inventoryRow.getByText('Low stock', { exact: true })).toBeVisible();
      }
    });

    await test.step('Service Management creates service entries but exposes pricing and edit gaps', async () => {
      await page.goto(`${runtimeConfig.staffBaseUrl}/admin/services`);
      await page.getByRole('heading', { name: /Booking Service Creation/i }).waitFor();

      const categorySection = page.locator('section').filter({ hasText: 'Create Service Category' }).first();
      await categorySection.getByPlaceholder('Preventive Maintenance').fill(serviceCategoryName);
      await categorySection
        .getByPlaceholder('Routine maintenance bundles and recurring upkeep work.')
        .fill('QA-created service category for pricing/billing proof.');

      const createServiceCategoryResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/service-categories'),
        { timeout: 30_000 },
      );
      await categorySection.getByRole('button', { name: /Create Category/i }).click();
      const serviceCategory = await expectJson(await createServiceCategoryResponsePromise, 'Create service category from staff UI');
      expect(serviceCategory.name).toBe(serviceCategoryName);
      await expect(page.getByText('Service category created.', { exact: true }).first()).toBeVisible();

      const serviceSection = page.locator('section').filter({ hasText: 'Create Booking Service' }).first();
      await serviceSection.getByPlaceholder('Oil Change').fill(serviceName);
      await serviceSection.locator('select').selectOption({ label: serviceCategoryName });
      await serviceSection.locator('input[type="number"]').first().fill('850');
      await serviceSection.getByPlaceholder('45').fill('45');
      await serviceSection
        .getByPlaceholder('Replace engine oil and inspect basic consumables.')
        .fill('QA service entry used to check service pricing admin UX.');

      const createServiceResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/services'),
        { timeout: 30_000 },
      );
      await serviceSection.getByRole('button', { name: /Create Booking Service/i }).click();
      const service = await expectJson(await createServiceResponsePromise, 'Create booking service from staff UI');
      expect(service.name).toBe(serviceName);
      expect(service.basePriceCents).toBe(85_000);

      await serviceSection.getByPlaceholder('Oil Change').fill(inactiveServiceName);
      await serviceSection.locator('select').selectOption({ label: serviceCategoryName });
      await serviceSection.locator('input[type="number"]').first().fill('450');
      await serviceSection.getByPlaceholder('45').fill('30');
      await fieldWithinLabel(serviceSection, 'Publish as active', 'input').uncheck();
      await serviceSection
        .getByPlaceholder('Replace engine oil and inspect basic consumables.')
        .fill('Inactive QA service should remain visible for staff review.');
      const createInactiveServiceResponsePromise = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/api/services'),
        { timeout: 30_000 },
      );
      await serviceSection.getByRole('button', { name: /Create Booking Service/i }).click();
      const inactiveService = await expectJson(
        await createInactiveServiceResponsePromise,
        'Create inactive booking service from staff UI',
      );
      expect(inactiveService.isActive).toBe(false);
      expect(inactiveService.basePriceCents).toBe(45_000);

      const servicesTable = page.locator('table[aria-label="Live booking services"]').first();
      const serviceRow = servicesTable.locator('tbody tr').filter({ hasText: serviceName }).first();
      await expect(serviceRow.getByText(serviceName, { exact: true })).toBeVisible();
      await expect(serviceRow.getByText('Active', { exact: true })).toBeVisible();
      await expect(serviceRow).toContainText('850');
      await expect(servicesTable.locator('tbody tr').filter({ hasText: inactiveServiceName }).getByText('Inactive', { exact: true })).toBeVisible();

      const servicePageText = await page.locator('main').innerText();
      if (!/\b(Price|Pricing|Rate|Amount)\b/i.test(servicePageText)) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Service Management can create service names, categories, duration, and active state, but it has no visible pricing/rate field, so configured service pricing cannot be proven from this admin screen.',
        });
      }

      if (rawUuidPattern().test(await serviceRow.innerText())) {
        addFinding(testInfo, {
          severity: 'medium',
          summary:
            'Service Management still exposes the raw service UUID in the Live Booking Services table instead of a business-readable service code.',
        });
      }

      const actionText = await servicesTable.innerText();
      if (!/\b(Edit|Deactivate|Archive|Save)\b/i.test(actionText)) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Service Management creates service entries but does not expose edit/deactivate/archive controls for existing services, so service CRUD is incomplete from the staff UI.',
        });
      }
    });

    await test.step('Loyalty admin keeps reward config separate from earning rules', async () => {
      const reward = await mainPost(
        request,
        '/api/admin/loyalty/rewards',
        superAdminSession.accessToken,
        {
          name: rewardName,
          description: 'QA reward config for admin CRUD separation proof.',
          fulfillmentNote: 'Created for admin CRUD QA only.',
          rewardType: 'discount_coupon',
          pointsCost: 9999,
          discountPercent: 5,
          status: 'active',
          reason: 'Admin CRUD QA creates reward config.',
        },
        'Create loyalty reward config through admin API setup',
      );

      const earningRule = await mainPost(
        request,
        '/api/admin/loyalty/earning-rules',
        superAdminSession.accessToken,
        {
          name: ruleName,
          description: 'QA earning rule for admin CRUD separation proof.',
          accrualSource: 'both',
          formulaType: 'flat_points',
          flatPoints: 1,
          minimumAmountCents: 1,
          promoLabel: `QA_ADMIN_CRUD_${slugify(runMarker).toUpperCase()}`,
          manualBenefitNote: 'Config separation proof only.',
          status: 'active',
          reason: 'Admin CRUD QA creates earning rule.',
        },
        'Create loyalty earning rule through admin API setup',
      );

      await page.goto(`${runtimeConfig.staffBaseUrl}/loyalty`);
      await page.getByRole('heading', { name: /Loyalty Management/i }).waitFor();
      await page.getByRole('button', { name: 'Reward Config' }).click();
      await expect(page.getByText('Reward config is redemption-only', { exact: true })).toBeVisible();
      await page.getByPlaceholder('Search reward catalog...').fill(rewardName);
      await expect(page.getByText(reward.name, { exact: true })).toBeVisible();
      await expect(page.getByText('Deactivate', { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Earning Rules' }).click();
      await expect(page.getByText('Earning rules control when points are awarded', { exact: true })).toBeVisible();
      await page.getByPlaceholder('Search earning rules...').fill(earningRule.name);
      await expect(page.getByText(earningRule.name, { exact: true })).toBeVisible();
      await expect(page.getByText('Deactivate', { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: /Create Earning Rule/i }).click();
      const ruleModal = page.locator('.fixed.inset-0').filter({ hasText: 'Create Earning Rule' }).first();
      await expect(ruleModal.getByText('Eligible Products', { exact: true })).toBeVisible();
      await expect(ruleModal.getByText('Eligible Product Categories', { exact: true })).toBeVisible();
      await expect(ruleModal.locator('select').filter({ hasText: 'Choose a product' }).first()).toBeVisible();
      await expect(ruleModal.locator('select').filter({ hasText: 'Choose a product category' }).first()).toBeVisible();
      const ruleModalText = await ruleModal.innerText();
      if (/\bProduct ID\b|\bProduct Category ID\b/i.test(ruleModalText)) {
        addFinding(testInfo, {
          severity: 'medium',
          summary:
            'Loyalty earning-rule configuration still uses raw Product ID and Product Category ID text fields instead of searchable product/category pickers, which is risky for admin data entry.',
        });
      }
      await ruleModal.getByRole('button', { name: 'Cancel' }).click();
    });

    await test.step('Invoices & Orders renders service invoice details and ecommerce manual payment state', async () => {
      const serviceJobOrder = await findFinalizedServiceJobOrder(request, customerSession, adviserSession);
      if (!serviceJobOrder) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'No finalized customer service job order was available in this local dataset, so service invoice loading could not be proven in this admin CRUD billing run.',
        });
      } else {
        try {
          await verifyInvoiceLookup(page, serviceJobOrder.id, {
            scheduledDate: serviceJobOrder.workDate,
            testInfo,
          });

          await expect(page.getByText(/INV-/).first(), 'Service invoice detail should show an invoice reference.').toBeVisible();
          await expect(page.getByText(/Invoice total/i), 'Service invoice detail should show an invoice total.').toBeVisible();
          await expect(page.getByText('Subtotal', { exact: true }), 'Service invoice detail should show subtotal.').toBeVisible();
          await expect(
            page.getByText('Reservation fee deduction', { exact: true }).first(),
            'Service invoice detail should show reservation fee deduction.',
          ).toBeVisible();
          await expect(page.getByText('Total', { exact: true }).first(), 'Service invoice detail should show total.').toBeVisible();
          await expect(
            page.getByText(/Amount recorded|Pending Payment|Paid/i).first(),
            'Service invoice detail should show payment status or amount recorded.',
          ).toBeVisible();
        } catch (error) {
          addFinding(testInfo, {
            severity: 'high',
            summary: `Invoices & Orders could not load the finalized service record during this run: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }

      expect(inventoryProduct, 'Inventory product created earlier is required for ecommerce billing proof.').toBeTruthy();
      const ecommerceOrder = await createApiBackedEcommerceOrder(request, customerSession, {
        product: inventoryProduct,
        runMarker,
      });
      let ecommerceInvoice = await ecommerceGet(
        request,
        `/api/orders/${ecommerceOrder.id}/invoice`,
        customerSession.accessToken,
        'Load ecommerce invoice for admin CRUD billing QA',
      );

      expect(ecommerceOrder.orderNumber).toMatch(/^ORD-/);
      expect(ecommerceInvoice.invoiceNumber).toMatch(/^INV-/);
      expect(ecommerceInvoice.status).toBe('pending_payment');

      await verifyStaffInvoiceSurface(page, {
        customerEmail: qaAccounts.customer.email,
        orderNumber: ecommerceOrder.orderNumber,
        invoiceNumber: ecommerceInvoice.invoiceNumber,
        expectedStatus: 'Pending Payment',
      });

      await expect(page.getByText('Manual ecommerce payment', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /Record Ecommerce Payment/i })).toBeVisible();

      const paymentReference = await recordManualEcommercePaymentFromStaffUi(page, {
        invoiceNumber: ecommerceInvoice.invoiceNumber,
        amountCents: ecommerceInvoice.amountDueCents,
      });

      ecommerceInvoice = await ecommerceGet(
        request,
        `/api/orders/${ecommerceOrder.id}/invoice`,
        customerSession.accessToken,
        'Load ecommerce invoice after admin CRUD manual payment',
      );
      expect(ecommerceInvoice.status).toBe('paid');
      await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(paymentReference, { exact: false })).toBeVisible();
    });
  });
});
