import { expect, test } from '@playwright/test';

import {
  expectElementsNotToOverlap,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
} from './uiAssertions.mjs';

const staffUser = {
  id: 'staff-edge-1',
  email: 'edge.adviser@example.com',
  role: 'service_adviser',
  isActive: true,
  staffCode: 'SA-EDGE',
  profile: { firstName: 'Edge', lastName: 'Adviser' },
};

const staffSession = {
  accessToken: 'edge-access',
  refreshToken: 'edge-refresh',
  user: staffUser,
};

const buildQueueResult = (items = []) => ({
  items,
  summary: {
    total: items.length,
    mine: 0,
    unassigned: items.length,
    blocked: 0,
    overdue: 0,
  },
  session: {
    available: true,
    capacity: 12,
    activeClaimCount: 0,
    activeClaims: [],
    currentClaimId: null,
    currentClaim: null,
  },
  page: { hasNext: false, nextCursor: null },
});

const installStaffSession = async (page) => {
  await page.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value);
  }, ['cc_auth_session', JSON.stringify(staffSession)]);
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(staffUser),
  }));
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
});

test('the canonical login URL does not render through a 404 response', async ({ page }) => {
  const response = await page.goto('/login');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
  expect(page.url()).toContain('/login');
});

test('blank staff login focuses the first invalid field and exposes linked errors', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('textbox', { name: 'Email' })).toBeFocused();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Password is required.')).toBeVisible();

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: 'Password' });
  await expectElementsNotToOverlap(email, password);
  await expectNoHorizontalOverflow(page);
});

test('network failure produces a recoverable staff sign-in message', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.abort('failed'));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('staff@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword1!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Unable to reach AutoCare. Check your connection and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
});

test('empty 5xx authentication responses never expose raw status text', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 503, body: '' }));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('staff@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword1!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('AutoCare is temporarily unavailable. Try again in a moment.')).toBeVisible();
  await expect(page.getByText(/status 503/i)).toHaveCount(0);
});

test('a selected-record claim conflict remains visible and does not navigate', async ({ page }) => {
  await installStaffSession(page);
  const queueResult = buildQueueResult([{
    entityType: 'job_order',
    entityId: 'job-edge-1',
    jobOrderId: 'job-edge-1',
    reference: 'JO-EDGE-0001',
    customerName: null,
    vehicleName: null,
    plateNumber: null,
    status: 'in_progress',
    queueEnteredAt: null,
    claim: null,
  }]);

  await page.route('**/api/staff-work-queues/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' && request.url().includes('/claims')) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'WORK_CLAIM_CONFLICT',
          message: 'This record was claimed by another staff member.',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(request.url().includes('/presence') ? { items: [] } : queueResult),
    });
  });

  await page.goto('/admin/job-orders');
  await page.getByRole('button', { name: 'Take this' }).click();

  await expect(page.getByText('This record was claimed by another staff member.')).toBeVisible();
  await expect(page.getByText(/20667d waiting/)).toHaveCount(0);
  expect(page.url()).toContain('/admin/job-orders');
});

test('malformed 500-item queue payloads stay bounded in the rendered tree', async ({ page }) => {
  await installStaffSession(page);
  const items = Array.from({ length: 500 }, (_, index) => ({
    entityType: 'job_order',
    entityId: `job-edge-${index}`,
    jobOrderId: `job-edge-${index}`,
    reference: `JO-EDGE-${String(index).padStart(4, '0')}`,
    status: 'in_progress',
    queueEnteredAt: null,
    claim: null,
  }));
  const queueResult = buildQueueResult(items);

  await page.route('**/api/staff-work-queues/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(route.request().url().includes('/presence') ? { items: [] } : queueResult),
  }));

  await page.goto('/admin/job-orders');
  await expect(page.getByText('JO-EDGE-0000')).toBeVisible();
  await expect(page.getByRole('button', { name: /Preview JO-EDGE-/ })).toHaveCount(25);
});

test('QA detail failure keeps the claimed queue usable and exposes no stale verdict actions', async ({ page }) => {
  await installStaffSession(page);
  const claim = {
    id: 'qa-claim-edge-1',
    entityType: 'job_order',
    entityId: 'qa-job-edge-1',
    queueType: 'qa',
    status: 'active',
    isMine: true,
    ownerUserId: staffUser.id,
    ownerName: 'Edge Adviser',
    leaseExpiresAt: '2099-08-03T00:00:00.000Z',
  };
  const queueResult = buildQueueResult([{
    entityType: 'job_order',
    entityId: 'qa-job-edge-1',
    jobOrderId: 'qa-job-edge-1',
    reference: 'JO-QA-EDGE-0001',
    customerName: 'Queue Customer',
    vehicleName: 'Toyota Vios',
    plateNumber: 'QA-EDGE',
    status: 'ready_for_qa',
    queueEnteredAt: null,
    claim,
  }]);
  queueResult.summary.mine = 1;
  queueResult.summary.unassigned = 0;
  queueResult.session.activeClaimCount = 1;
  queueResult.session.activeClaims = [claim];
  queueResult.session.currentClaimId = claim.id;
  queueResult.session.currentClaim = claim;

  await page.route('**/api/staff-work-queues/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(route.request().url().includes('/presence') ? { items: [] } : queueResult),
  }));
  await page.route('**/api/job-orders/qa-job-edge-1/qa', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'QA detail is temporarily unavailable.' }),
  }));

  await page.goto('/admin/qa-audit');

  await expect(page.getByText('JO-QA-EDGE-0001').first()).toBeVisible();
  await expect(page.getByText('QA detail is temporarily unavailable.')).toBeVisible();
  await expect(page.getByText('No audit loaded')).toBeVisible();
  await expect(page.getByText('No verdict target')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Verdict' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record Verdict' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test('null and read-only queue stories do not expose misleading actions', async ({ page }) => {
  await page.goto('http://127.0.0.1:6006/iframe.html?id=operations-staffworkqueueitem--missing-data&viewMode=story');
  await expect(page.getByText('Unidentified work item')).toBeVisible();
  await expect(page.getByText(/waiting/i)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('http://127.0.0.1:6006/iframe.html?id=operations-staffworkqueueitem--history-read-only&viewMode=story');
  await expect(page.getByRole('button', { name: /Take this|Open|Resume|Release/ })).toHaveCount(0);
});

test('staff login controls remain accessible at the supported viewport', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  const passwordToggle = page.getByRole('button', { name: 'Show password' });
  await expect(passwordToggle).toBeVisible();

  const box = await passwordToggle.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
