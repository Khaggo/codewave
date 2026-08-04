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

async function chooseInsuranceVehicle(page, plateNumber) {
  await page.getByRole('button', { name: /Choose insurance vehicle/i }).click();
  await page.getByRole('textbox', { name: 'Search vehicles' }).fill(plateNumber);
  await page.getByRole('button', { name: new RegExp(plateNumber, 'i') }).click();
  await expect(
    page.getByRole('button', {
      name: new RegExp(`Choose insurance vehicle.*${plateNumber}`, 'i'),
    }),
  ).toBeVisible();
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

test('Insurance Add vehicle resumes the unfinished request on the created vehicle', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'high',
    'Adding a missing vehicle from Insurance must return the customer to the same unfinished request without losing input.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('INSURANCE-ADD-VEHICLE');
  const token = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-6);
  const sourcePlate = `IS${token}`;
  const createdPlate = `IN${token}`;
  const requestDescription = `Preserve this unfinished insurance request. ${runMarker}`;
  const customerSession = await apiLogin(request, qaAccounts.customer);

  await createCustomerVehicle(request, customerSession, {
    plateNumber: sourcePlate,
    make: 'Toyota',
    model: `Draft ${token.slice(-4)}`,
    year: 2023,
    color: 'Gray',
    notes: `${runMarker} source vehicle`,
  });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  try {
    await proxyMobileApiTraffic(context);
    const page = await context.newPage();

    await loginMobileCustomer(page, qaAccounts.customer);
    await page.getByRole('tab', { name: 'Insurance' }).click();
    await chooseInsuranceVehicle(page, sourcePlate);
    await page.getByRole('tab', { name: 'Request' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Request details', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Request description' }).fill(requestDescription);

    await page.getByRole('button', { name: /Choose insurance vehicle/i }).click();
    await page.getByRole('button', { name: 'Add vehicle' }).click();
    await expect(page.getByText('Add vehicle', { exact: true }).first()).toBeVisible();

    await page.getByRole('textbox', { name: 'Plate number' }).fill(createdPlate);
    await page.getByRole('textbox', { name: 'Vehicle make' }).fill('Honda');
    await page.getByRole('textbox', { name: 'Vehicle model' }).fill(`Resume ${token.slice(-4)}`);
    await page.getByRole('textbox', { name: 'Vehicle year' }).fill('2025');
    await page.getByRole('textbox', { name: 'Vehicle color' }).fill('Blue');
    await page.getByText('Save vehicle', { exact: true }).click();

    await expect(
      page.getByRole('button', {
        name: new RegExp(`Choose insurance vehicle.*${createdPlate}`, 'i'),
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Request details', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Request description' }).last()).toHaveValue(
      requestDescription,
    );

    await restoreMobileSession(page);
    await page.getByRole('tab', { name: 'Insurance' }).click();
    await chooseInsuranceVehicle(page, createdPlate);
    await page.getByRole('tab', { name: 'Request' }).click();
    await expect(page.getByText('Request details', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Request description' }).last()).toHaveValue(
      requestDescription,
    );
  } finally {
    await context.close();
  }
});
