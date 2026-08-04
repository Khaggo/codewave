import { expect, test } from '@playwright/test';

const runtimeConfig = {
  staffBaseUrl: process.env.QA_STAFF_BASE_URL ?? 'http://127.0.0.1:3002',
  apiBaseUrl: process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000',
};
const sharedPassword = process.env.BOOKING_JOB_ORDER_QA_PASSWORD;
const adviserAccount = {
  email: process.env.QA_ADVISER_EMAIL ?? 'qa.booking.adviser@autocare.com',
  password: process.env.QA_ADVISER_PASSWORD ?? process.env.QA_STAFF_PASSWORD ?? sharedPassword,
};
const customerAccount = {
  email: process.env.QA_CUSTOMER_EMAIL ?? 'qa.booking.customer@example.com',
  password: process.env.QA_CUSTOMER_PASSWORD ?? sharedPassword,
};
const apiBaseUrl = runtimeConfig.apiBaseUrl.replace(/\/$/, '');

const apiUrl = (path) => `${apiBaseUrl}${path}`;

const apiLogin = async (request, account) => {
  const response = await request.post(apiUrl('/api/auth/login'), {
    data: { email: account.email, password: account.password },
  });
  expect(response.ok(), `Login for ${account.email} failed with ${response.status()}.`).toBeTruthy();
  return json(response);
};

const loginStaff = async (page, account) => {
  await page.goto(`${runtimeConfig.staffBaseUrl}/bookings`);
  await page.getByPlaceholder('email@example.com').fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForFunction(() => {
    try {
      return Boolean(JSON.parse(window.localStorage.getItem('cc_auth_session'))?.accessToken);
    } catch {
      return false;
    }
  });
};

const json = async (response) => {
  const body = await response.text();
  return body ? JSON.parse(body) : null;
};

const expectUnauthorized = async (request, path) => {
  const response = await request.get(apiUrl(path));

  expect(
    response.status(),
    `Unauthenticated request to ${path} must fail closed.`,
  ).toBe(401);
};

const adviserSessionHeaders = (session) => ({
  Authorization: `Bearer ${session.accessToken}`,
});

const fixtureUser = {
  id: 'pw-accessories-admin-fixture',
  email: 'accessories.admin.fixture@example.com',
  role: 'super_admin',
  isActive: true,
  profile: { firstName: 'Accessories', lastName: 'Fixture Admin' },
};

const fixtureAdviser = {
  ...fixtureUser,
  id: 'pw-accessories-adviser-fixture',
  email: 'accessories.adviser.fixture@example.com',
  role: 'service_adviser',
  profile: { firstName: 'Accessories', lastName: 'Fixture Adviser' },
};

const fixtureSession = {
  accessToken: 'pw-accessories-admin-fixture-token',
  refreshToken: 'pw-accessories-admin-fixture-refresh',
  user: fixtureUser,
};

const makeCatalogRows = () =>
  Array.from({ length: 500 }, (_, index) => ({
    product: {
      id: `accessory-product-${index}`,
      name: `Fixture accessory ${index}`,
      slug: `fixture-accessory-${index}`,
      isLighting: false,
      status: 'draft',
      version: 1,
    },
    category: { id: 'accessory-category-fixture', name: 'Accessories' },
  }));

const makeStockRows = () =>
  Array.from({ length: 500 }, (_, index) => ({
    variant: {
      id: `accessory-variant-${index}`,
      name: `Fixture variant ${index}`,
      sku: `FIXTURE-${String(index).padStart(4, '0')}`,
      version: 1,
      createdAt: '2026-08-03T00:00:00.000Z',
    },
    product: { id: `accessory-product-${index}`, name: `Fixture accessory ${index}` },
    inventory: { onHandQuantity: 10, reservedQuantity: 0, availableQuantity: 10 },
  }));

const makeOrderRows = () =>
  Array.from({ length: 500 }, (_, index) => ({
    id: `accessory-order-${index}`,
    orderReference: `ACC-20260803-${String(index).padStart(4, '0')}`,
    status: 'reserved',
    paymentStatus: 'pending',
    createdAt: '2026-08-03T00:00:00.000Z',
    contactSnapshot: { name: 'Fixture Customer', phone: '09170000000' },
    assignedToUserId: null,
    totalCents: 10000,
    currencyCode: 'PHP',
    version: 1,
  }));

const fulfillJson = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

async function installFixtureStaffSession(page, user = fixtureUser) {
  const session = { ...fixtureSession, user };
  await page.addInitScript((session) => {
    window.localStorage.setItem('cc_auth_session', JSON.stringify(session));
  }, session);

  await page.route('**/api/auth/me', (route) =>
    fulfillJson(route, user),
  );
}

async function installBoundedAccessoriesFixtures(page) {
  const catalogRows = makeCatalogRows();
  const stockRows = makeStockRows();
  const orderRows = makeOrderRows();

  await page.route('**/api/admin/accessories/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith('/catalog/categories')) {
      return fulfillJson(route, []);
    }

    if (pathname.endsWith('/catalog/products')) {
      return fulfillJson(route, { items: catalogRows, nextCursor: 'fixture-cursor' });
    }

    if (pathname.endsWith('/stock')) {
      return fulfillJson(route, { items: stockRows, nextCursor: 'fixture-cursor' });
    }

    if (pathname.endsWith('/orders')) {
      return fulfillJson(route, { items: orderRows, nextCursor: 'fixture-cursor' });
    }

    if (pathname.endsWith('/refunds')) {
      return fulfillJson(route, { items: [], nextCursor: null });
    }

    return fulfillJson(route, { message: 'Unexpected Accessories fixture request.' }, 404);
  });
}

test.describe('Accessories local safety and bounded surfaces', () => {
  test.beforeEach(async ({ request }) => {
    const [health, staff] = await Promise.all([
      request.get(apiUrl('/api/health')),
      request.get(`${runtimeConfig.staffBaseUrl}/bookings`),
    ]);
    expect(health.ok(), 'Backend health check failed.').toBeTruthy();
    expect(staff.ok(), 'Staff web health check failed.').toBeTruthy();
  });

  test('unauthenticated customer and admin Accessories APIs fail closed', async ({ request }) => {
    await Promise.all([
      expectUnauthorized(request, '/api/accessories/capabilities'),
      expectUnauthorized(request, '/api/accessories/products?limit=25'),
      expectUnauthorized(request, '/api/accessories/cart'),
      expectUnauthorized(request, '/api/admin/accessories/catalog/products?limit=25'),
      expectUnauthorized(request, '/api/admin/accessories/stock?limit=25'),
    ]);
  });

  test('service adviser can open accessory orders but cannot use super-admin catalog or stock APIs', async ({
    browser,
    request,
  }) => {
    test.skip(!adviserAccount.password, 'Configure a staff QA password to run adviser RBAC checks.');
    const adviser = await apiLogin(request, adviserAccount);
    const headers = adviserSessionHeaders(adviser);

    const ordersResponse = await request.get(apiUrl('/api/admin/accessories/orders?limit=25'), { headers });
    expect(ordersResponse.status()).toBe(200);
    expect(await json(ordersResponse)).toEqual(
      expect.objectContaining({ items: expect.any(Array) }),
    );

    for (const path of [
      '/api/admin/accessories/catalog/products?limit=25',
      '/api/admin/accessories/stock?limit=25',
    ]) {
      const response = await request.get(apiUrl(path), { headers });
      expect(response.status(), `${path} must remain super-admin-only.`).toBe(403);
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginStaff(page, adviserAccount);
      await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/orders`);
      await expect(page.getByRole('heading', { name: 'Accessory Orders', exact: true })).toBeVisible();

      await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/catalog`);
      await expect(
        page.getByRole('heading', { name: 'This workspace is not available for your role.' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /Create|Publish|Manage/ })).toHaveCount(0);

      await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/stock`);
      await expect(
        page.getByRole('heading', { name: 'This workspace is not available for your role.' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /Adjust/ })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('catalog, stock, and order lists render no more than 25 rows from 500-record fixtures', async ({
    page,
  }) => {
    await installFixtureStaffSession(page);
    await installBoundedAccessoriesFixtures(page);

    const surfaces = [
      { path: '/admin/accessories/catalog', heading: 'Accessory Catalog' },
      { path: '/admin/accessories/stock', heading: 'Accessory Stock' },
      { path: '/admin/accessories/orders', heading: 'Accessory Orders' },
    ];

    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const surface of surfaces) {
        await page.goto(`${runtimeConfig.staffBaseUrl}${surface.path}`);
        await expect(page.getByRole('heading', { name: surface.heading })).toBeVisible();
        await expect(page.locator('tbody tr')).toHaveCount(25);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page.locator('tbody tr')).toHaveCount(25);
        await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          `${surface.path} must not overflow horizontally at ${viewport.width}px.`,
        ).toBeTruthy();
      }
    }
  });

  test('a stale Take conflict refreshes ownership and rapid clicks send one mutation', async ({
    page,
  }) => {
    await installFixtureStaffSession(page, fixtureAdviser);
    await installBoundedAccessoriesFixtures(page);
    let takeRequests = 0;
    await page.route('**/api/admin/accessories/orders/accessory-order-0/take', async (route) => {
      takeRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return fulfillJson(route, { message: 'The order version is stale.' }, 409);
    });

    await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/orders`);
    const take = page.getByRole('button', { name: 'Take' }).first();
    await expect(take).toBeVisible();
    await take.dblclick();

    await expect(page.getByText('This order changed in another session. The latest queue and order details are now shown.')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(25);
    expect(takeRequests).toBe(1);
  });

  test('an invalid pickup code preserves the order and shows the authoritative conflict', async ({
    page,
  }) => {
    await installFixtureStaffSession(page, fixtureAdviser);
    await installBoundedAccessoriesFixtures(page);
    const readyOrder = {
      ...makeOrderRows()[0],
      status: 'ready_for_pickup',
      assignedToUserId: fixtureAdviser.id,
    };
    let collectionRequests = 0;

    await page.route('**/api/admin/accessories/orders?**', (route) =>
      fulfillJson(route, { items: [readyOrder], nextCursor: null }),
    );
    await page.route('**/api/admin/accessories/orders/accessory-order-0', (route) => {
      return fulfillJson(route, { order: readyOrder, items: [], history: [] });
    });
    await page.route('**/api/admin/accessories/orders/accessory-order-0/status', (route) => {
      collectionRequests += 1;
      return fulfillJson(
        route,
        { code: 'ACCESSORY_PICKUP_CODE_INVALID', message: 'The pickup code is invalid.' },
        409,
      );
    });

    await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/orders`);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page.getByLabel('Order reference for collection').fill(readyOrder.orderReference);
    await page.getByLabel('Six-digit pickup code').fill('000000');
    await page.getByRole('button', { name: 'Verify and collect' }).click();

    await expect(page.getByText('The pickup code is invalid.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: readyOrder.orderReference })).toBeVisible();
    await expect(page.getByText('Order collected and stock consumed.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Verify and collect' })).toBeEnabled();
    expect(collectionRequests).toBe(1);
  });

  test('service adviser direct routes expose fulfillment but fail closed for catalog and stock', async ({
    page,
  }) => {
    await installFixtureStaffSession(page, fixtureAdviser);
    await installBoundedAccessoriesFixtures(page);

    await page.goto(`${runtimeConfig.staffBaseUrl}/admin/accessories/orders`);
    await expect(page.getByRole('heading', { name: 'Accessory Orders' })).toBeVisible();

    for (const path of ['/admin/accessories/catalog', '/admin/accessories/stock']) {
      await page.goto(`${runtimeConfig.staffBaseUrl}${path}`);
      await expect(
        page.getByRole('heading', { name: 'This workspace is not available for your role.' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /Create|Publish|Adjust/ })).toHaveCount(0);
    }
  });

  test('customer capability state is explicit and feature-off recovery remains retryable', async ({ request }) => {
    test.skip(!customerAccount.password, 'Configure a customer QA password to run capability checks.');
    const customer = await apiLogin(request, customerAccount);
    const headers = { Authorization: `Bearer ${customer.accessToken}` };
    const capabilityPath = '/api/accessories/capabilities';

    const firstResponse = await request.get(apiUrl(capabilityPath), { headers });
    expect(firstResponse.status()).toBe(200);
    const firstCapabilities = await json(firstResponse);

    expect(firstCapabilities).toEqual(
      expect.objectContaining({
        mode: expect.stringMatching(/^(off|staff_preview|catalog|ordering)$/),
        staffPreview: expect.any(Boolean),
        catalogVisible: expect.any(Boolean),
        orderingEnabled: expect.any(Boolean),
        pickupOnly: true,
      }),
    );

    if (!firstCapabilities.catalogVisible) {
      const productsResponse = await request.get(apiUrl('/api/accessories/products?limit=25'), { headers });
      expect(productsResponse.status()).toBe(403);
      expect(await json(productsResponse)).toEqual(
        expect.objectContaining({ code: 'ACCESSORY_CATALOG_DISABLED' }),
      );
    }

    const retryResponse = await request.get(apiUrl(capabilityPath), { headers });
    expect(retryResponse.status()).toBe(200);
    expect(await json(retryResponse)).toEqual(firstCapabilities);
  });
});
