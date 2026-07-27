import { test, expect } from '@playwright/test';

import { apiLogin, createCustomerVehicle, ensureLocalQaRuntime } from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import { loginStaff } from '../helpers/flows.mjs';

async function expectJson(response, label) {
  const body = await response.text();
  expect(response.ok(), `${label} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();
  return body ? JSON.parse(body) : null;
}

async function createInsuranceInquiry(request, accessToken, payload) {
  const response = await request.post(`${runtimeConfig.apiBaseUrl}/api/insurance/inquiries`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: payload,
  });

  return expectJson(response, 'Create insurance inquiry');
}

test('staff insurance manual reminder and broadcast sends work from the live queue', async ({ page, request }) => {
  await ensureLocalQaRuntime(request);

  const runMarker = createRunMarker('INSMSG');
  const customerSession = await apiLogin(request, qaAccounts.customer);

  const temporaryVehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber: `IM${runMarker.replace(/[^A-Z0-9]/gi, '').slice(-6)}`,
    make: 'Toyota',
    model: `Reminder ${runMarker.slice(-4)}`,
    year: 2023,
    color: 'Gray',
    notes: `${runMarker} insurance manual send vehicle`,
  });

  const inquiry = await createInsuranceInquiry(request, customerSession.accessToken, {
    userId: customerSession.user.id,
    vehicleId: temporaryVehicle.id,
    purpose: 'claim',
    inquiryType: 'comprehensive',
    subject: `Manual Reminder ${runMarker}`,
    description: `Insurance send proof request for ${runMarker}.`,
    providerName: 'QA Insurance Provider',
    policyNumber: `INS-${runMarker}`,
    notes: `${runMarker} insurance manual send`,
  });

  expect(inquiry?.id).toBeTruthy();

  await loginStaff(page, qaAccounts.adviser, '/bookings');
  await page.goto(`${runtimeConfig.staffBaseUrl}/insurance`);
  await page.getByRole('heading', { name: 'Live Staff Insurance Queue' }).waitFor();

  await page.getByPlaceholder('Find by case, customer, or vehicle').fill(runMarker);
  await expect(page.getByText(`Manual Reminder ${runMarker}`, { exact: false }).first()).toBeVisible();

  const reminderPanel = page.locator('div.rounded-2xl').filter({ has: page.getByText('Manual Reminder Send', { exact: true }) }).first();
  await reminderPanel.getByRole('button', { name: /Open panel/i }).click();
  await reminderPanel.getByRole('button', { name: 'Select visible cases' }).click();

  const reminderResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/api\/insurance\/reminders\/send$/.test(response.url()),
    { timeout: 30_000 },
  );
  await reminderPanel.getByRole('button', { name: 'Send Reminder' }).click();
  const reminderResponse = await reminderResponsePromise;
  const reminderSummary = await reminderResponse.json();
  expect(reminderResponse.ok(), `Insurance reminder send failed with ${reminderResponse.status()}`).toBeTruthy();
  expect(reminderSummary?.sentCount, 'At least one insurance reminder should be sent in the live queue flow.').toBeGreaterThan(0);
  await expect(reminderPanel.getByText(/Sent \d+ reminder\(s\)\./i)).toBeVisible();

  const broadcastPanel = page.locator('div.rounded-2xl').filter({ has: page.getByText('Custom Broadcast Send', { exact: true }) }).first();
  await broadcastPanel.getByRole('button', { name: /Open panel/i }).click();
  await broadcastPanel.getByLabel('Broadcast Title').fill(`Insurance update ${runMarker}`);
  await broadcastPanel.getByLabel('Broadcast Message').fill(
    `Please review the latest insurance update for ${runMarker} in the customer app inbox.`,
  );
  if (await broadcastPanel.getByRole('button', { name: 'Select visible cases' }).isVisible().catch(() => false)) {
    await broadcastPanel.getByRole('button', { name: 'Select visible cases' }).click().catch(() => null);
  }

  const broadcastResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/api\/insurance\/broadcasts\/send$/.test(response.url()),
    { timeout: 30_000 },
  );
  await broadcastPanel.getByRole('button', { name: 'Send Broadcast' }).click();
  const broadcastResponse = await broadcastResponsePromise;
  const broadcastSummary = await broadcastResponse.json();
  expect(broadcastResponse.ok(), `Insurance broadcast send failed with ${broadcastResponse.status()}`).toBeTruthy();
  expect(
    broadcastSummary?.sentCount,
    'At least one insurance broadcast should be sent in the live queue flow.',
  ).toBeGreaterThan(0);
  await expect(
    broadcastPanel.getByText(/Sent \d+(?: of \d+ customer broadcast\(s\)| broadcast\(s\) to \d+ customer\(s\))\./i),
  ).toBeVisible();
});
