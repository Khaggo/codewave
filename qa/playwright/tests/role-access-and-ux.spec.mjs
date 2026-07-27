import { test, expect } from '@playwright/test';

import { annotateSeverity } from '../helpers/assertions.mjs';
import { ensureLocalQaRuntime } from '../helpers/api.mjs';
import { qaAccounts } from '../helpers/config.mjs';
import { expectTextPresent, loginStaff } from '../helpers/flows.mjs';

test.beforeEach(async ({ request }) => {
  await ensureLocalQaRuntime(request, { requireMobile: false });
});

test('service adviser can open Job Orders and QA Audit without super-admin session', async ({ browser }, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'The live workshop flow is adviser-owned, so a service adviser must be able to open Job Orders and QA Audit without super-admin help.',
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await loginStaff(page, qaAccounts.adviser, '/admin/job-orders');
  await expect(page.getByRole('heading', { name: 'Job Orders' })).toBeVisible();

  await page.goto('http://127.0.0.1:3002/admin/qa-audit');
  await expect(page.getByRole('heading', { name: 'QA Audit' })).toBeVisible();

  await context.close();
});

test('retired technician and head-technician accounts are blocked with explicit retirement copy', async ({
  browser,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'high',
    'Retired workshop logins should fail clearly so QA does not mistake intentional role retirement for a broken staff portal.',
  );

  for (const account of [qaAccounts.technician, qaAccounts.headTechnician]) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:3002/bookings');
    await page.getByPlaceholder('email@example.com').fill(account.email);
    await page.getByPlaceholder('Enter your password').fill(account.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expectTextPresent(
      page,
      'Technician login has been retired. Service advisers now manage workshop progress and technician assignments.',
    );
    await expect(page.getByRole('heading', { name: /Booking Schedule|Job Orders|QA Audit|Invoices & Orders/i })).toHaveCount(0);

    await context.close();
  }
});

test('web login validates empty credentials before attempting staff auth', async ({ page }, testInfo) => {
  annotateSeverity(
    testInfo,
    'medium',
    'Basic login validation should keep empty submissions from becoming silent auth failures.',
  );

  await page.goto('http://127.0.0.1:3002/bookings');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password is required.', { exact: true })).toBeVisible();
});
