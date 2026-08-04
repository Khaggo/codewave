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
const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf8');

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(response.ok(), `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function createInsuranceInquiry(request, customerSession, vehicleId, runMarker) {
  const response = await request.post(`${apiBaseUrl}/api/insurance/inquiries`, {
    headers: {
      Authorization: `Bearer ${customerSession.accessToken}`,
    },
    data: {
      userId: customerSession.user.id,
      vehicleId,
      clientRequestId: randomUUID(),
      inquiryType: 'comprehensive',
      purpose: 'claim',
      subject: `Upload recovery ${runMarker}`,
      description: `Insurance upload interruption fixture. ${runMarker}`,
    },
  });

  return expectJson(response, 'Create Insurance upload recovery inquiry');
}

async function openInsuranceDocuments(page, { plateNumber }) {
  await page.getByRole('tab', { name: 'Insurance' }).click();
  await expect(page.getByText('Current vehicle', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Choose insurance vehicle/i }).click();
  await page.getByRole('textbox', { name: 'Search vehicles' }).fill(plateNumber);
  await page.getByRole('button', { name: new RegExp(plateNumber, 'i') }).click();
  await page.getByRole('tab', { name: 'Documents' }).click();
  await expect(page.getByText('Already on file', { exact: true })).toBeVisible();
}

async function choosePdf(page, fileName) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select insurance document file' }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: pdfBuffer,
  });
  await expect(page.getByText(fileName, { exact: true }).last()).toBeVisible();
}

async function restoreMobileSession(page) {
  await page.reload();

  const emailInput = page.getByPlaceholder('Email');
  if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await emailInput.fill(qaAccounts.customer.email);
    await page.getByPlaceholder('Password').fill(qaAccounts.customer.password);
    await page.getByText('Sign in', { exact: true }).last().click();
  }

  await page.getByText('Book Service', { exact: true }).waitFor();
}

test('mobile Insurance restores an interrupted upload and retries without duplicating the file', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'An interrupted Insurance document upload must survive restart as a truthful retry and must not create duplicate files.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('INSURANCE-UPLOAD-RECOVERY');
  const plateToken = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-6);
  const plateNumber = `IU${plateToken}`;
  const fileName = `${runMarker}-or-cr.pdf`;
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const vehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber,
    make: 'Toyota',
    model: `Upload ${plateToken.slice(-4)}`,
    year: 2024,
    color: 'White',
    notes: `${runMarker} upload recovery fixture`,
  });
  const inquiry = await createInsuranceInquiry(request, customerSession, vehicle.id, runMarker);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let uploadAttempt = 0;

  try {
    await proxyMobileApiTraffic(context);
    await context.route('**/api/insurance/inquiries/*/documents/upload', async (route) => {
      uploadAttempt += 1;

      if (uploadAttempt === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Temporary upload interruption. Try again.',
          }),
        });
        return;
      }

      await route.fallback();
    });

    const page = await context.newPage();
    await loginMobileCustomer(page, qaAccounts.customer);
    await openInsuranceDocuments(page, { plateNumber });
    await page.getByRole('radio', { name: 'OR/CR' }).click();
    await choosePdf(page, fileName);
    await page.getByRole('button', { name: 'Upload insurance document' }).click();
    await expect(page.getByText('Temporary upload interruption. Try again.', { exact: false })).toBeVisible();

    await page.waitForTimeout(500);
    await restoreMobileSession(page);
    await openInsuranceDocuments(page, { plateNumber });
    await expect(page.getByText('Pending staged uploads', { exact: true })).toBeVisible();
    await expect(page.getByText(fileName, { exact: true })).toBeVisible();
    await expect(
      page.getByText('Select this file again. File access is not retained after the app restarts.', {
        exact: true,
      }),
    ).toBeVisible();

    await page.getByRole('button', { name: `Select ${fileName} again` }).click();
    await expect(page.getByText(/does not retain access to files after restart/i)).toBeVisible();
    await choosePdf(page, fileName);
    await page.getByRole('button', { name: 'Upload insurance document' }).click();
    await expect(page.getByText(/Document attached\./)).toBeVisible();

    const recoveredInquiry = await expectJson(
      await request.get(`${apiBaseUrl}/api/insurance/inquiries/${inquiry.id}`, {
        headers: {
          Authorization: `Bearer ${customerSession.accessToken}`,
        },
      }),
      'Verify recovered Insurance upload',
    );
    const matchingDocuments = recoveredInquiry.documents.filter(
      (document) => document.fileName === fileName,
    );

    expect(uploadAttempt).toBe(2);
    expect(matchingDocuments).toHaveLength(1);
  } finally {
    await context.close();
  }
});
