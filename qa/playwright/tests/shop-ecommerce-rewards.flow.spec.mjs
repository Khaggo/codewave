import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { test, expect } from '@playwright/test';

import { annotateSeverity, selectOptionContaining } from '../helpers/assertions.mjs';
import {
  apiLogin,
  ensureLocalQaRuntime,
  pollUntil,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, runtimeConfig } from '../helpers/config.mjs';

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

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(
    response.ok(),
    `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`,
  ).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function expectFailedJson(response, contextLabel, expectedStatus) {
  const body = await response.text();
  expect(
    response.status(),
    `${contextLabel} expected ${expectedStatus} but got ${response.status()}${body ? `: ${body}` : ''}`,
  ).toBe(expectedStatus);

  return body ? JSON.parse(body) : null;
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

async function mainGet(request, pathname, accessToken, contextLabel) {
  return expectJson(
    await request.get(mainApiUrl(pathname), {
      headers: authHeaders(accessToken),
    }),
    contextLabel,
  );
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

async function mainPatch(request, pathname, accessToken, payload, contextLabel) {
  return expectJson(
    await request.patch(mainApiUrl(pathname), {
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
          VALUES ($1, 'super_admin', 'QA-ECOM-SUPER', true, null, null)
          ON CONFLICT (email)
          DO UPDATE SET
            role = 'super_admin',
            staff_code = 'QA-ECOM-SUPER',
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
          VALUES ($1, 'QA', 'Ecommerce Superadmin', '+639170009999')
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

async function getLoyaltySnapshot(request, customerSession, label) {
  const [account, transactions] = await Promise.all([
    mainGet(
      request,
      `/api/loyalty/accounts/${customerSession.user.id}`,
      customerSession.accessToken,
      `${label} loyalty account`,
    ),
    mainGet(
      request,
      `/api/loyalty/accounts/${customerSession.user.id}/transactions`,
      customerSession.accessToken,
      `${label} loyalty transactions`,
    ),
  ]);

  return {
    account,
    transactions: Array.isArray(transactions) ? transactions : [],
    pointsBalance: Number(account?.pointsBalance ?? 0),
  };
}

async function clearCustomerCart(request, customerSession) {
  const cart = await ecommerceGet(
    request,
    `/api/cart?customerUserId=${encodeURIComponent(customerSession.user.id)}`,
    customerSession.accessToken,
    'Load customer cart before ecommerce QA',
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

async function createQaCatalogProduct(request, { runMarker, productIndex = 1 }) {
  const slugSuffix = slugify(`${runMarker}-${productIndex}`);
  const category = await ecommercePost(
    request,
    '/api/product-categories',
    null,
    {
      name: `QA Ecommerce Rewards ${runMarker}`,
      slug: `qa-ecommerce-rewards-${slugSuffix}`,
      description: 'Playwright-created category for shop/ecommerce rewards QA.',
      isActive: true,
    },
    'Create ecommerce QA category',
  );

  const product = await ecommercePost(
    request,
    '/api/products',
    null,
    {
      categoryId: category.id,
      name: `QA Rewards Brake Cleaner ${runMarker}`,
      slug: `qa-rewards-brake-cleaner-${slugSuffix}`,
      sku: `QA-REWARDS-${slugSuffix.toUpperCase().replace(/-/g, '-')}`,
      description: 'Playwright-created product for customer shop checkout and ecommerce loyalty proof.',
      priceCents: 100_000,
      quantityOnHand: 12,
      reorderThreshold: 2,
      isActive: true,
    },
    'Create ecommerce QA product',
  );

  return { category, product };
}

async function createEcommerceRewardAndRule(request, superAdminSession, { runMarker, product, category, pointsCost }) {
  const reward = await mainPost(
    request,
    '/api/admin/loyalty/rewards',
    superAdminSession.accessToken,
    {
      name: `QA Ecommerce Reward ${runMarker}`,
      description: 'Redeemable reward created by ecommerce loyalty Playwright QA.',
      fulfillmentNote: 'QA reward should disappear from customer redemption when deactivated.',
      rewardType: 'discount_coupon',
      pointsCost,
      discountPercent: 5,
      status: 'active',
      reason: 'Created for ecommerce rewards QA.',
    },
    'Create QA loyalty reward config',
  );

  const earningRule = await mainPost(
    request,
    '/api/admin/loyalty/earning-rules',
    superAdminSession.accessToken,
    {
      name: `QA Ecommerce Earning ${runMarker}`,
      description: 'Awards flat QA points only after a fully paid ecommerce invoice.',
      accrualSource: 'ecommerce',
      formulaType: 'flat_points',
      flatPoints: 9,
      minimumAmountCents: 1,
      eligibleProductIds: [product.id],
      eligibleProductCategoryIds: [category.id],
      promoLabel: `QA_ECOMMERCE_${runMarker}`,
      manualBenefitNote: 'No manual benefit; used for QA evidence only.',
      status: 'active',
      reason: 'Created for ecommerce paid-invoice accrual QA.',
    },
    'Create QA ecommerce earning rule',
  );

  return { reward, earningRule };
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
    'Add product to cart through ecommerce API',
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
        addressLine1: '123 QA Commerce Street',
        addressLine2: 'Playwright Checkout',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100',
      },
      notes: `API ecommerce rule-deactivation proof ${runMarker}`,
    },
    'Create API-backed ecommerce invoice order',
  );
}

async function recordEcommercePayment(request, adviserSession, invoice, amountCents, label) {
  return ecommercePost(
    request,
    `/api/invoices/${invoice.id}/payments`,
    adviserSession.accessToken,
    {
      amountCents,
      paymentMethod: 'cash',
      reference: `QA-${label}-${invoice.invoiceNumber}`.slice(0, 120),
      notes: `Playwright ${label} payment entry for ecommerce loyalty QA.`,
      receivedAt: new Date().toISOString(),
    },
    `Record ${label} ecommerce invoice payment`,
  );
}

async function findOrderByNote(request, customerSession, noteMarker) {
  const orders = await ecommerceGet(
    request,
    `/api/users/${encodeURIComponent(customerSession.user.id)}/orders`,
    customerSession.accessToken,
    `List ecommerce orders for ${noteMarker}`,
  );

  return (orders ?? []).find((order) => String(order?.notes ?? '').includes(noteMarker)) ?? null;
}

async function ensureMobileCustomerSignedIn(page) {
  await page.goto(runtimeConfig.mobileBaseUrl);

  if (await page.getByText('Book Service', { exact: true }).isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }

  const emailInput = page.getByPlaceholder('Email');
  if (!(await emailInput.isVisible().catch(() => false))) {
    const signInEntryPoint = page.getByText('Sign in', { exact: true }).last();
    if (await signInEntryPoint.isVisible().catch(() => false)) {
      await signInEntryPoint.click();
    }
  }

  await page.getByPlaceholder('Email').fill(qaAccounts.customer.email);
  await page.getByPlaceholder('Password').fill(qaAccounts.customer.password);
  await page.getByText('Sign in', { exact: true }).last().click();
  await page.getByText('Book Service', { exact: true }).waitFor();
}

async function loginStaffForHeading(page, account, startPath, headingPattern) {
  await page.goto(`${runtimeConfig.staffBaseUrl}${startPath}`);
  await page.getByPlaceholder('email@example.com').fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: headingPattern }).waitFor();
}

async function openCustomerShopAndCheckout(page, product, noteMarker) {
  await page.getByText('Shop', { exact: true }).last().click();
  await page.getByPlaceholder('Search products, SKU, or category').waitFor();
  await page.getByPlaceholder('Search products, SKU, or category').fill(product.sku);
  await page.getByText(product.name, { exact: true }).first().waitFor();
  await page.getByText(product.name, { exact: true }).first().click();
  await page.getByText('Invoice checkout ready', { exact: true }).waitFor();
  await expect(page.getByText('Product Code', { exact: true })).toBeVisible();
  await expect(page.getByText(product.sku, { exact: true }).first()).toBeVisible();

  const rawProductIdVisible = await page
    .getByText(product.id, { exact: true })
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  await page.getByText('Add to Cart', { exact: true }).click();
  await expect(page.getByText('Open Cart', { exact: true })).toBeVisible();
  await page.getByText('Open Cart', { exact: true }).click();
  await page.getByText('Your Cart', { exact: true }).waitFor();
  await page.getByText('Review Invoice Checkout', { exact: true }).click();
  await page.getByText('Invoice Preview', { exact: true }).waitFor();
  await page.getByText('Continue to Billing', { exact: true }).click();
  await page.getByPlaceholder('Billing recipient name').waitFor();

  await page.getByPlaceholder('Billing recipient name').fill('Queue Customer');
  await page.getByPlaceholder('name@example.com').fill(qaAccounts.customer.email);
  await page.getByPlaceholder('09123456789').fill('09170000101');
  await page.getByPlaceholder('Street address').fill('123 QA Commerce Street');
  await page.getByPlaceholder('Unit, building, or landmark').fill('Playwright Checkout');
  await page.getByPlaceholder('City').fill('Quezon City');
  await page.getByPlaceholder('Province').fill('Metro Manila');
  await page.getByPlaceholder('1200').fill('1100');
  await page.getByPlaceholder('Optional notes for staff invoice handling').fill(noteMarker);
  await page.getByText('Create Invoice Checkout', { exact: true }).click();
  await page.getByText('Invoice order created', { exact: true }).waitFor();

  return { rawProductIdVisible };
}

async function verifyStaffInvoiceSurface(page, { customerEmail, orderNumber, invoiceNumber, expectedStatus }) {
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

async function recordManualEcommercePaymentFromStaffUi(page, { invoiceNumber, amountCents, label }) {
  const amountPhp = amountCents / 100;
  expect(Number.isInteger(amountPhp), 'Manual ecommerce payment UI accepts whole PHP amounts in this QA setup.').toBeTruthy();

  const reference = `QA-${label}-${invoiceNumber}`.slice(0, 120);
  await expect(page.getByText('Manual ecommerce payment', { exact: true })).toBeVisible();
  await page.getByLabel('Payment amount (PHP)').fill(String(amountPhp));
  await page.getByLabel('Payment method').selectOption('cash');
  await page.getByLabel('Reference').fill(reference);
  await page.getByLabel('Notes').fill(`Playwright ${label} payment entry through staff Invoices & Orders UI.`);
  await page.getByRole('button', { name: /Record Ecommerce Payment/i }).click();

  await expect(page.getByText(reference, { exact: false })).toBeVisible();

  return reference;
}

async function verifyStaffCatalogSurface(page, account, { product, category }) {
  await loginStaffForHeading(page, account, '/shop', /Shop Data Is Managed Through Admin Pages/i);
  await expect(page.getByText('Catalog Admin', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Inventory Admin', { exact: true }).first()).toBeVisible();

  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/catalog`);
  await page.getByRole('heading', { name: /Catalog Admin/i }).waitFor();
  await expect(page.getByText(category.name, { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder('Search by name, category, SKU, or description').fill(product.sku);
  await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(product.sku, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible();
}

test('customer shop checkout awards rewards only after fully paid ecommerce invoice with active earning rule', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'Objective 1 and Objective 3 require ecommerce checkout and rewards to work from paid order invoices, with reward config separate from earning rules.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });
  await ensureEcommerceQaRuntime(request);

  const runMarker = createRunMarker('ECOM-REWARD');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const superAdminSession = await loginOrSeedSuperAdmin(request);
  await clearCustomerCart(request, customerSession);

  const { category, product } = await createQaCatalogProduct(request, { runMarker });
  const catalogContext = await browser.newContext();
  const catalogPage = await catalogContext.newPage();
  await verifyStaffCatalogSurface(catalogPage, superAdminAccount, { product, category });
  await catalogContext.close();

  const baselineLoyalty = await getLoyaltySnapshot(request, customerSession, 'Baseline ecommerce QA');
  const { reward, earningRule } = await createEcommerceRewardAndRule(request, superAdminSession, {
    runMarker,
    product,
    category,
    pointsCost: baselineLoyalty.pointsBalance + 1,
  });

  const afterConfigCreation = await getLoyaltySnapshot(request, customerSession, 'After reward/rule creation');
  expect(
    afterConfigCreation.pointsBalance,
    'Creating reward config or earning rules must not change customer points.',
  ).toBe(baselineLoyalty.pointsBalance);

  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await proxyMobileApiTraffic(customerContext);
  const customerPage = await customerContext.newPage();

  await ensureMobileCustomerSignedIn(customerPage);
  const uiCheckoutResult = await openCustomerShopAndCheckout(customerPage, product, runMarker);

  expect(
    uiCheckoutResult.rawProductIdVisible,
    'Mobile product detail must not expose the raw product UUID; customer-facing shop detail should use SKU/Product Code.',
  ).toBe(false);

  const createdOrder = await pollUntil(
    `ecommerce order with checkout note ${runMarker}`,
    async () => findOrderByNote(request, customerSession, runMarker),
    Boolean,
    { timeoutMs: 45_000, intervalMs: 1_500 },
  );
  expect(createdOrder.orderNumber, 'Created ecommerce order should use a business-readable order number.').toMatch(/^ORD-/);
  expect(createdOrder.invoice?.invoiceNumber, 'Created ecommerce invoice should use a business-readable invoice number.').toMatch(
    /^INV-/,
  );
  expect(createdOrder.invoice?.status, 'Checkout should create an unpaid ecommerce invoice.').toBe('pending_payment');

  const afterUnpaidOrder = await getLoyaltySnapshot(request, customerSession, 'After unpaid ecommerce order');
  expect(afterUnpaidOrder.pointsBalance, 'Unpaid ecommerce order creation must not award points.').toBe(
    baselineLoyalty.pointsBalance,
  );

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await loginStaffForHeading(staffPage, qaAccounts.adviser, '/admin/invoices', /Invoices & Orders/i);
  await verifyStaffInvoiceSurface(staffPage, {
    customerEmail: qaAccounts.customer.email,
    orderNumber: createdOrder.orderNumber,
    invoiceNumber: createdOrder.invoice.invoiceNumber,
    expectedStatus: 'Pending Payment',
  });

  await expect(staffPage.getByText('Manual ecommerce payment', { exact: true })).toBeVisible();
  await expect(staffPage.getByRole('button', { name: /Record Ecommerce Payment/i })).toBeVisible();

  let invoice = await ecommerceGet(
    request,
    `/api/orders/${createdOrder.id}/invoice`,
    customerSession.accessToken,
    'Load ecommerce invoice after checkout',
  );
  const partialAmountCents = Math.floor(invoice.totalCents / 2);
  const partialReference = await recordManualEcommercePaymentFromStaffUi(staffPage, {
    invoiceNumber: invoice.invoiceNumber,
    amountCents: partialAmountCents,
    label: 'partial',
  });
  invoice = await ecommerceGet(
    request,
    `/api/orders/${createdOrder.id}/invoice`,
    customerSession.accessToken,
    'Load ecommerce invoice after staff UI partial payment',
  );
  expect(invoice.status, 'Partial ecommerce payment should leave invoice partially paid.').toBe('partially_paid');

  await new Promise((resolve) => setTimeout(resolve, 4_000));
  const afterPartialPayment = await getLoyaltySnapshot(request, customerSession, 'After partial ecommerce payment');
  expect(afterPartialPayment.pointsBalance, 'Partially paid ecommerce invoice must not award points.').toBe(
    baselineLoyalty.pointsBalance,
  );

  const finalReference = await recordManualEcommercePaymentFromStaffUi(staffPage, {
    invoiceNumber: invoice.invoiceNumber,
    amountCents: invoice.amountDueCents,
    label: 'final',
  });
  invoice = await ecommerceGet(
    request,
    `/api/orders/${createdOrder.id}/invoice`,
    customerSession.accessToken,
    'Load ecommerce invoice after staff UI final payment',
  );
  expect(invoice.status, 'Final ecommerce payment should settle the invoice.').toBe('paid');

  const afterPaidInvoice = await pollUntil(
    `loyalty points for paid ecommerce invoice ${invoice.invoiceNumber}`,
    async () => getLoyaltySnapshot(request, customerSession, 'After paid ecommerce invoice'),
    (snapshot) =>
      snapshot.pointsBalance > baselineLoyalty.pointsBalance &&
      snapshot.transactions.some(
        (transaction) =>
          transaction?.sourceType === 'purchase_payment' &&
          transaction?.sourceReference === invoice.id &&
          (transaction?.metadata?.appliedRuleIds ?? []).includes(earningRule.id),
      ),
    { timeoutMs: 60_000, intervalMs: 1_500 },
  );

  const ecommerceTransaction = afterPaidInvoice.transactions.find(
    (transaction) => transaction?.sourceType === 'purchase_payment' && transaction?.sourceReference === invoice.id,
  );
  expect(ecommerceTransaction?.pointsDelta, 'Paid ecommerce invoice should create a positive purchase_payment entry.').toBeGreaterThan(0);

  await staffPage.reload();
  await verifyStaffInvoiceSurface(staffPage, {
    customerEmail: qaAccounts.customer.email,
    orderNumber: createdOrder.orderNumber,
    invoiceNumber: invoice.invoiceNumber,
    expectedStatus: 'Paid',
  });
  await expect(staffPage.getByText('2 ecommerce entries', { exact: false })).toBeVisible();
  await expect(staffPage.getByText(partialReference, { exact: false })).toBeVisible();
  await expect(staffPage.getByText(finalReference, { exact: false })).toBeVisible();

  await customerPage.reload();
  await ensureMobileCustomerSignedIn(customerPage);
  await customerPage.getByText('Rewards', { exact: true }).last().click();
  await expect(customerPage.getByText('Your Rewards Wallet', { exact: true })).toBeVisible();
  await expect(customerPage.getByText('Recent Loyalty Activity', { exact: true })).toBeVisible();
  await expect(customerPage.getByText('Paid ecommerce order', { exact: false }).first()).toBeVisible();
  await expect(customerPage.getByText(reward.name, { exact: true }).first()).toBeVisible();

  await mainPatch(
    request,
    `/api/admin/loyalty/rewards/${reward.id}/status`,
    superAdminSession.accessToken,
    {
      status: 'inactive',
      reason: 'QA verifies reward config only controls redemption availability.',
    },
    'Deactivate QA reward config',
  );

  const customerRewardsAfterDeactivation = await mainGet(
    request,
    '/api/loyalty/rewards',
    customerSession.accessToken,
    'List customer rewards after reward deactivation',
  );
  expect(
    customerRewardsAfterDeactivation.some((entry) => entry?.id === reward.id),
    'Inactive reward config should not remain redeemable/visible to the customer.',
  ).toBeFalsy();

  await mainPatch(
    request,
    `/api/admin/loyalty/earning-rules/${earningRule.id}/status`,
    superAdminSession.accessToken,
    {
      status: 'inactive',
      reason: 'QA verifies deactivating the earning rule stops future accrual from this rule.',
    },
    'Deactivate QA ecommerce earning rule',
  );

  const secondProductSetup = await createQaCatalogProduct(request, { runMarker: `${runMarker}-NO-RULE`, productIndex: 2 });
  const secondOrder = await createApiBackedEcommerceOrder(request, customerSession, {
    product: secondProductSetup.product,
    runMarker,
  });
  let secondInvoice = await ecommerceGet(
    request,
    `/api/orders/${secondOrder.id}/invoice`,
    customerSession.accessToken,
    'Load second ecommerce invoice after rule deactivation',
  );
  secondInvoice = await recordEcommercePayment(request, adviserSession, secondInvoice, secondInvoice.amountDueCents, 'rule-off');

  await new Promise((resolve) => setTimeout(resolve, 6_000));
  const afterRuleOffPayment = await getLoyaltySnapshot(request, customerSession, 'After inactive rule ecommerce payment');
  const deactivatedRuleTransaction = afterRuleOffPayment.transactions.find(
    (transaction) =>
      transaction?.sourceType === 'purchase_payment' &&
      transaction?.sourceReference === secondInvoice.id &&
      (transaction?.metadata?.appliedRuleIds ?? []).includes(earningRule.id),
  );
  expect(
    deactivatedRuleTransaction,
    'Inactive ecommerce earning rule must not apply to future paid ecommerce invoices.',
  ).toBeFalsy();

  const superAdminContext = await browser.newContext();
  const loyaltyAdminPage = await superAdminContext.newPage();
  await loginStaffForHeading(loyaltyAdminPage, superAdminAccount, '/loyalty', /Loyalty Management/i);
  await loyaltyAdminPage.getByRole('button', { name: 'Reward Config' }).click();
  await expect(loyaltyAdminPage.getByText('Reward config is redemption-only', { exact: true })).toBeVisible();
  await expect(loyaltyAdminPage.getByText(reward.name, { exact: true })).toBeVisible();
  await expect(loyaltyAdminPage.getByText('Inactive', { exact: true }).first()).toBeVisible();
  await loyaltyAdminPage.getByRole('button', { name: 'Earning Rules' }).click();
  await expect(loyaltyAdminPage.getByText('Earning rules control when points are awarded', { exact: true })).toBeVisible();
  await expect(loyaltyAdminPage.getByText(earningRule.name, { exact: true })).toBeVisible();

  const adviserLoyaltyRulesResponse = await request.get(mainApiUrl('/api/admin/loyalty/earning-rules'), {
    headers: authHeaders(adviserSession.accessToken),
  });
  await expectFailedJson(
    adviserLoyaltyRulesResponse,
    'Service adviser direct access to earning-rule configuration',
    403,
  );

  await customerContext.close();
  await staffContext.close();
  await superAdminContext.close();
});
