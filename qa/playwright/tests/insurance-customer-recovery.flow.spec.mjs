import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';

import { annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  createCustomerVehicle,
  ensureLocalQaRuntime,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts } from '../helpers/config.mjs';
import { loginMobileCustomer } from '../helpers/flows.mjs';

const apiBaseUrl = process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000';

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(response.ok(), `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function createRetrySafeInquiry(request, customerSession, payload) {
  const create = () =>
    request.post(`${apiBaseUrl}/api/insurance/inquiries`, {
      headers: {
        Authorization: `Bearer ${customerSession.accessToken}`,
      },
      data: payload,
    });

  const firstInquiry = await expectJson(await create(), 'Create customer Insurance inquiry');
  const retriedInquiry = await expectJson(await create(), 'Retry customer Insurance inquiry');

  expect(retriedInquiry.id, 'A retry with the same clientRequestId must return the original inquiry.').toBe(
    firstInquiry.id,
  );

  return firstInquiry;
}

async function updateInquiryForCustomer(request, adviserSession, inquiryId, { customerMessage, reviewNotes }) {
  const response = await request.patch(`${apiBaseUrl}/api/insurance/inquiries/${inquiryId}/status`, {
    headers: {
      Authorization: `Bearer ${adviserSession.accessToken}`,
    },
    data: {
      status: 'under_review',
      customerMessage,
      reviewNotes,
    },
  });

  return expectJson(response, 'Publish customer-visible Insurance update');
}

async function expectRecoveredInquiry(page, { plateNumber, vehicleLabel, customerMessage, reviewNotes }) {
  await page.getByRole('tab', { name: 'Insurance' }).click();
  await expect(page.getByText('Current vehicle', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Choose insurance vehicle/i }).click();
  await page.getByRole('textbox', { name: 'Search vehicles' }).fill(plateNumber);
  await expect(page.getByText('1 of', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(plateNumber, 'i') }).click();

  await expect(
    page.getByRole('button', { name: new RegExp(`Choose insurance vehicle.*${plateNumber}`, 'i') }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Status' }).click();

  await expect(page.getByText(customerMessage, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(vehicleLabel, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(reviewNotes, { exact: true })).toHaveCount(0);
}

test('mobile Insurance recovers one retry-safe customer request in a fresh session', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'A customer must recover an active Insurance request on another session without seeing internal staff notes or duplicate work.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('INSURANCE-RECOVERY');
  const plateToken = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-6);
  const plateNumber = `IR${plateToken}`;
  const vehicleLabel = `2024 Honda Recovery ${plateToken.slice(-4)} • ${plateNumber}`;
  const customerMessage = `We are reviewing your request. No action is needed right now. ${runMarker}`;
  const reviewNotes = `Internal adviser routing note. ${runMarker}`;
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const vehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber,
    make: 'Honda',
    model: `Recovery ${plateToken.slice(-4)}`,
    year: 2024,
    color: 'Silver',
    notes: `${runMarker} mobile Insurance recovery fixture`,
  });
  const inquiryPayload = {
    userId: customerSession.user.id,
    vehicleId: vehicle.id,
    clientRequestId: randomUUID(),
    inquiryType: 'comprehensive',
    purpose: 'claim',
    subject: `Mobile Insurance recovery ${runMarker}`,
    description: `Customer needs guided claim assistance. ${runMarker}`,
    incidentOccurredAt: '2026-07-29T08:30:00.000Z',
    incidentLocation: 'Quezon City',
  };
  const inquiry = await createRetrySafeInquiry(request, customerSession, inquiryPayload);

  await updateInquiryForCustomer(request, adviserSession, inquiry.id, {
    customerMessage,
    reviewNotes,
  });

  const mineResponse = await expectJson(
    await request.get(`${apiBaseUrl}/api/insurance/inquiries/mine`, {
      headers: {
        Authorization: `Bearer ${customerSession.accessToken}`,
      },
      params: {
        vehicleId: vehicle.id,
        limit: 20,
      },
    }),
    'Verify retry-safe customer inquiry list',
  );

  expect(mineResponse.items.filter((item) => item.id === inquiry.id)).toHaveLength(1);

  for (let sessionIndex = 0; sessionIndex < 2; sessionIndex += 1) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

    try {
      await proxyMobileApiTraffic(context);
      const page = await context.newPage();

      await loginMobileCustomer(page, qaAccounts.customer);
      await expectRecoveredInquiry(page, {
        plateNumber,
        vehicleLabel,
        customerMessage,
        reviewNotes,
      });
    } finally {
      await context.close();
    }
  }
});
