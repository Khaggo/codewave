import { test, expect } from '@playwright/test';

import { annotateSeverity } from '../helpers/assertions.mjs';
import { ensureLocalQaRuntime } from '../helpers/api.mjs';
import { qaAccounts } from '../helpers/config.mjs';
import { expectTextPresent, loginStaff } from '../helpers/flows.mjs';

test.beforeEach(async ({ request }) => {
  await ensureLocalQaRuntime(request, { requireMobile: false });
});

test('head technician can open Job Orders and QA Audit without super-admin session', async ({ browser }, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'Head technician access to Job Orders and QA Audit should not depend on the super admin account.',
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await loginStaff(page, qaAccounts.headTechnician, '/admin/job-orders');
  await expect(page.getByRole('heading', { name: 'Job Orders' })).toBeVisible();
  await expect(page.getByText('This workspace is limited to QA-capable staff roles.', { exact: false })).toHaveCount(0);

  await page.goto('http://127.0.0.1:3002/admin/qa-audit');
  await expect(page.getByRole('heading', { name: 'QA Audit' })).toBeVisible();
  await expect(page.getByText('This workspace is limited to QA-capable staff roles.', { exact: false })).toHaveCount(0);

  await context.close();
});

test('technician is blocked from role-gated booking and invoice workspaces with meaningful copy', async ({ browser }, testInfo) => {
  annotateSeverity(
    testInfo,
    'high',
    'Unauthorized role access should fail clearly instead of leaving technicians on broken or misleading admin pages.',
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await loginStaff(page, qaAccounts.technician, '/bookings');
  await expectTextPresent(page, 'This workspace is not available for your role.');
  await expectTextPresent(page, 'Your role does not have access to that workspace in the staff portal.');
  await expectTextPresent(page, 'Blocked page: /bookings');

  await page.goto('http://127.0.0.1:3002/admin/invoices');
  await expectTextPresent(page, 'This workspace is not available for your role.');
  await expectTextPresent(page, 'Blocked page: /admin/invoices');

  await context.close();
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
