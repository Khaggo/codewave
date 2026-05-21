import path from 'node:path';

import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import { apiLogin, ensureLocalQaRuntime, listCustomerBookings, listVehicleJobOrders, pollUntil } from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, runtimeConfig, seededVehicle } from '../helpers/config.mjs';
import {
  finalizeAndRecordPayment,
  loadJobOrderById,
  loginStaff,
  progressJobOrderForQa,
  recordQaVerdict,
} from '../helpers/flows.mjs';

function apiUrl(pathname) {
  return `${runtimeConfig.apiBaseUrl}${pathname}`;
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(response.ok(), `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();

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

async function apiGet(request, pathname, accessToken, contextLabel) {
  return expectJson(
    await request.get(apiUrl(pathname), {
      headers: authHeaders(accessToken),
    }),
    contextLabel,
  );
}

async function apiPost(request, pathname, accessToken, payload, contextLabel) {
  return expectJson(
    await request.post(apiUrl(pathname), {
      headers: authHeaders(accessToken),
      data: payload,
    }),
    contextLabel,
  );
}

async function apiPatch(request, pathname, accessToken, payload, contextLabel) {
  return expectJson(
    await request.patch(apiUrl(pathname), {
      headers: authHeaders(accessToken),
      data: payload,
    }),
    contextLabel,
  );
}

async function apiPostExpectFailure(request, pathname, accessToken, payload, expectedStatus, contextLabel) {
  return expectFailedJson(
    await request.post(apiUrl(pathname), {
      headers: authHeaders(accessToken),
      data: payload,
    }),
    contextLabel,
    expectedStatus,
  );
}

async function loginStaffForBackJobs(page, account) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/backjobs`);

  await page.getByPlaceholder('email@example.com').fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('heading', { name: 'Review And Rework Workbench' }).waitFor();
}

async function selectPortalOptionByText(page, scope, triggerName, optionText) {
  await scope.getByRole('combobox', { name: triggerName }).click();
  const option = page.getByRole('option').filter({ hasText: optionText }).first();
  await expect(option, `${triggerName} should offer option ${optionText}`).toBeVisible();
  await option.click();
}

async function selectPortalOptionByAnyText(page, scope, triggerName, optionTexts) {
  const candidates = [...new Set(optionTexts.filter(Boolean))];

  await scope.getByRole('combobox', { name: triggerName }).click();
  await expect(page.getByRole('option').first(), `${triggerName} should show selectable options.`).toBeVisible();

  for (const optionText of candidates) {
    const option = page.getByRole('option').filter({ hasText: optionText }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      return optionText;
    }
  }

  const availableOptions = await page.getByRole('option').allInnerTexts();
  throw new Error(
    `${triggerName} should offer one of ${candidates.join(', ')}. Available options: ${availableOptions.join(' | ')}`,
  );
}

function formatCompactDateToken(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatCompactTimeToken(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}${minutes}${seconds}`;
}

function formatReadableJobOrderReference(jobOrder, fallbackId) {
  if (jobOrder?.jobOrderReference) {
    return jobOrder.jobOrderReference;
  }

  const workDateToken = formatCompactDateToken(jobOrder?.workDate ?? jobOrder?.createdAt);
  const createdTimeToken = formatCompactTimeToken(jobOrder?.createdAt ?? jobOrder?.updatedAt);
  const prefix = jobOrder?.jobType === 'back_job' ? 'JO-RW' : 'JO';

  if (workDateToken) {
    return `${prefix}-${workDateToken}${createdTimeToken ? `-${createdTimeToken}` : ''}`;
  }

  return fallbackId ? `Job order ${String(fallbackId).slice(0, 8).toUpperCase()}` : 'Original job order';
}

function formatReadableReturnInspectionReference(inspection, fallbackId) {
  if (inspection?.inspectionReference) {
    return inspection.inspectionReference;
  }

  const dateToken = formatCompactDateToken(inspection?.createdAt);
  const timeToken = formatCompactTimeToken(inspection?.createdAt);

  if (dateToken) {
    return `INSP-${dateToken}${timeToken ? `-${timeToken}` : ''}`;
  }

  return fallbackId ? 'Linked return inspection' : 'No return inspection linked yet';
}

async function getCustomerVehicle(request, customerSession, vehicleId) {
  const vehicles = await apiGet(
    request,
    `/api/users/${customerSession.user.id}/vehicles`,
    customerSession.accessToken,
    'Load customer vehicles for back-job QA',
  );

  const vehicle =
    vehicles.find((entry) => entry?.id === vehicleId) ??
    vehicles.find((entry) => entry?.plateNumber === seededVehicle.plateNumber) ??
    vehicles.find((entry) => entry?.id);

  expect(vehicle, 'Back-job QA needs a customer vehicle to anchor the rework lineage.').toBeTruthy();

  return vehicle;
}

async function getAdminCustomer(request, adviserSession, customerId) {
  const customers = await apiGet(
    request,
    '/api/admin/customers',
    adviserSession.accessToken,
    'Load staff customer directory for back-job QA',
  );

  return customers.find((entry) => entry?.id === customerId) ?? null;
}

async function createReturnInspection(request, adviserSession, { vehicleId, bookingId, inspectorUserId, runMarker }) {
  return apiPost(
    request,
    `/api/vehicles/${vehicleId}/inspections`,
    adviserSession.accessToken,
    {
      inspectionType: 'return',
      status: 'completed',
      bookingId,
      inspectorUserId,
      notes: `${runMarker}: completed return inspection for back-job rework approval.`,
      findings: [
        {
          category: 'rework_validation',
          label: `Returned concern verified ${runMarker}`,
          severity: 'medium',
          notes: 'Inspector reproduced the returned concern and verified that rework is required.',
          isVerified: true,
        },
      ],
    },
    'Create completed return inspection for back-job approval',
  );
}

async function findBackJobOrigin(request, customerSession, adviserSession) {
  const bookings = await listCustomerBookings(request, customerSession);
  const vehicleIds = [...new Set(bookings.map((booking) => booking?.vehicleId).filter(Boolean))];

  for (const vehicleId of vehicleIds) {
    const jobOrders = await listVehicleJobOrders(request, adviserSession, vehicleId);
    const finalizedOrigin = jobOrders.find(
      (jobOrder) =>
        jobOrder?.status === 'finalized' &&
        jobOrder?.customerUserId === customerSession.user.id &&
        jobOrder?.vehicleId === vehicleId,
    );

    if (finalizedOrigin) {
      const nonFinalizedOrigin = jobOrders.find(
        (jobOrder) =>
          jobOrder?.status !== 'finalized' &&
          jobOrder?.customerUserId === customerSession.user.id &&
          jobOrder?.vehicleId === vehicleId,
      );

      return {
        vehicleId,
        finalizedOrigin,
        nonFinalizedOrigin,
        sourceBooking:
          finalizedOrigin.sourceType === 'booking'
            ? bookings.find((booking) => booking?.id === finalizedOrigin.sourceId) ?? null
            : null,
      };
    }
  }

  throw new Error('No finalized customer job order was available for Back-Jobs QA. Seed or complete a service flow first.');
}

function buildBackJobPayload({ customerSession, origin, complaint, reviewNotes, originalBookingId }) {
  return {
    customerUserId: customerSession.user.id,
    vehicleId: origin.vehicleId,
    originalJobOrderId: origin.finalizedOrigin.id,
    originalBookingId,
    complaint,
    reviewNotes,
    findings: [
      {
        category: 'customer_report',
        severity: 'medium',
        label: 'Returned concern after completed service',
        notes: 'Back-job QA confirms this complaint is linked to prior finalized work.',
        isValidated: true,
      },
    ],
  };
}

async function expectRawUuidHidden(scope, value, label) {
  if (!value) {
    return;
  }

  await expect(scope.getByText(String(value), { exact: true }), `${label} should not render as a raw UUID.`).toHaveCount(0);
}

async function loadBackJobDetailFromStaffUi(page, backJobId) {
  await page.getByRole('combobox', { name: 'Back-job id' }).fill(backJobId);
  const detailResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'GET' && response.url().includes(`/api/back-jobs/${backJobId}`),
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Load Case Detail' }).click();
  await expectJson(await detailResponsePromise, 'Load back-job detail from staff UI');
}

async function saveBackJobStatusFromUi(page, expectedStatus) {
  const statusResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && /\/api\/back-jobs\/[^/]+\/status$/.test(response.url()),
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Save Review Status' }).click();
  const updatedBackJob = await expectJson(await statusResponsePromise, `Move back-job to ${expectedStatus}`);
  expect(updatedBackJob?.status, `Back-job should move to ${expectedStatus}.`).toBe(expectedStatus);
  await expect(page.getByText('Back-job review status updated from the live backend.', { exact: true })).toBeVisible();
  return updatedBackJob;
}

test.describe('AUTOCARE Back-Jobs / rework QA', () => {
  test('staff creates a back-job from finalized service lineage and cannot use non-finalized work', async ({
    page,
    request,
  }, testInfo) => {
    annotateSeverity(
      testInfo,
      'critical',
      'Back-jobs must be rework cases tied to finalized prior service lineage, not unrelated fresh bookings.',
    );

    await ensureLocalQaRuntime(request);

    const [customerSession, adviserSession] = await Promise.all([
      apiLogin(request, qaAccounts.customer),
      apiLogin(request, qaAccounts.adviser),
    ]);

    const origin = await findBackJobOrigin(request, customerSession, adviserSession);
    const vehicle = await getCustomerVehicle(request, customerSession, origin.vehicleId);
    const runMarker = createRunMarker('PW-BACKJOB');
    const complaint = `${runMarker}: customer reports the same vibration returned after the completed service.`;
    const reviewNotes = `${runMarker}: opened from finalized service history, not a new booking.`;
    const originalBookingId =
      origin.finalizedOrigin.sourceType === 'booking' ? origin.finalizedOrigin.sourceId : undefined;
    const originShortId = origin.finalizedOrigin.id.slice(0, 8).toUpperCase();
    const jobOrderOptionReference = `JO-${originShortId}`;
    const jobOrderDisplayReference = formatReadableJobOrderReference(origin.finalizedOrigin, origin.finalizedOrigin.id);
    const originalBookingDisplayReference =
      origin.sourceBooking?.bookingReference ??
      origin.sourceBooking?.reference ??
      (originalBookingId ? `Booking ${String(originalBookingId).slice(0, 8).toUpperCase()}` : null);

    if (origin.nonFinalizedOrigin) {
      await apiPostExpectFailure(
        request,
        '/api/back-jobs',
        adviserSession.accessToken,
        {
          ...buildBackJobPayload({
            customerSession,
            origin: {
              ...origin,
              finalizedOrigin: origin.nonFinalizedOrigin,
            },
            complaint: `${runMarker}: invalid non-finalized origin should be rejected.`,
            reviewNotes: 'Negative QA check for finalized-lineage requirement.',
            originalBookingId:
              origin.nonFinalizedOrigin.sourceType === 'booking' ? origin.nonFinalizedOrigin.sourceId : undefined,
          }),
          originalJobOrderId: origin.nonFinalizedOrigin.id,
        },
        409,
        'Create back-job with non-finalized original work',
      );
    } else {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'This dataset did not include a non-finalized job order for the seeded customer vehicle, so the negative non-finalized-origin rejection was not exercised live.',
      });
    }

    await loginStaffForBackJobs(page, qaAccounts.adviser);

    const createForm = page.locator('form').filter({ hasText: 'Create Back-Job Case' });
    await expect(createForm, 'Create Back-Job Case form should be available to service advisers.').toBeVisible();

    await selectPortalOptionByText(page, createForm, 'Choose customer', qaAccounts.customer.email);
    await selectPortalOptionByText(page, createForm, 'Choose vehicle', vehicle.plateNumber ?? seededVehicle.plateNumber);
    await selectPortalOptionByAnyText(page, createForm, 'Choose finalized job order', [
      jobOrderDisplayReference,
      jobOrderOptionReference,
    ]);

    const originalCompletedServiceCard = page
      .locator('xpath=//div[p[normalize-space(.)="Original completed service"]]')
      .first();
    await expect(originalCompletedServiceCard, 'Original completed service lineage card should be visible.').toBeVisible();
    await expect(originalCompletedServiceCard.getByText(jobOrderDisplayReference, { exact: true })).toBeVisible();
    await expect(originalCompletedServiceCard.getByText('Eligible for back-job review', { exact: true })).toBeVisible();
    if (originalBookingDisplayReference) {
      await expect(originalCompletedServiceCard.getByText(originalBookingDisplayReference, { exact: true })).toBeVisible();
    }
    await expectRawUuidHidden(originalCompletedServiceCard, origin.finalizedOrigin.id, 'Original completed service job order');
    await expectRawUuidHidden(originalCompletedServiceCard, originalBookingId, 'Original completed service booking');

    await createForm
      .getByPlaceholder('Customer reports the same concern after prior completed work.')
      .fill(complaint);
    await createForm.getByLabel('Review notes').fill(reviewNotes);
    await createForm.getByLabel('Label').fill('Returned vibration after completed service');

    const createResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/back-jobs$/.test(response.url()),
      { timeout: 30_000 },
    );
    await createForm.getByRole('button', { name: 'Create Back-Job' }).click();
    const createResponse = await createResponsePromise;
    const createdBackJob = await expectJson(createResponse, 'Create Back-Job from staff UI');

    await expect(page.getByText('Back-job case created and linked to original work.', { exact: true })).toBeVisible();
    const detailPanel = page.locator('div.card').filter({ hasText: 'Live Back-Job Detail' }).first();
    const adminCustomer = await getAdminCustomer(request, adviserSession, customerSession.user.id);
    const customerLabel = adminCustomer?.displayName || adminCustomer?.email || qaAccounts.customer.email;
    await expect(detailPanel.getByText('Live Back-Job Detail', { exact: true })).toBeVisible();
    await expect(detailPanel.locator('h2')).toContainText(/^BJ-/);
    await expect(detailPanel.getByText(complaint, { exact: true }).first()).toBeVisible();
    await expect(detailPanel.getByText(customerLabel, { exact: false }).first()).toBeVisible();
    await expect(detailPanel.getByText(vehicle.plateNumber ?? seededVehicle.plateNumber, { exact: false }).first()).toBeVisible();
    await expectRawUuidHidden(detailPanel, createdBackJob.id, 'Back-job case');
    await expectRawUuidHidden(detailPanel, customerSession.user.id, 'Customer');
    await expectRawUuidHidden(detailPanel, origin.vehicleId, 'Vehicle');
    await expectRawUuidHidden(detailPanel, origin.finalizedOrigin.id, 'Original job order');
    await expectRawUuidHidden(detailPanel, originalBookingId, 'Original booking');
    await expect(page.getByText('Rework job creation unlocks only when the selected back-job is approved for rework and has no linked rework job order.')).toBeVisible();

    const linkedCases = await pollUntil(
      'created back-job should appear in vehicle back-job history',
      () =>
        apiGet(
          request,
          `/api/vehicles/${origin.vehicleId}/back-jobs`,
          adviserSession.accessToken,
          'List vehicle back-jobs after create',
        ),
      (cases) => Array.isArray(cases) && cases.some((entry) => entry?.id === createdBackJob.id),
      { timeoutMs: 30_000, intervalMs: 1_000 },
    );
    const storedBackJob = linkedCases.find((entry) => entry.id === createdBackJob.id);

    expect(storedBackJob).toEqual(
      expect.objectContaining({
        id: createdBackJob.id,
        customerUserId: customerSession.user.id,
        vehicleId: origin.vehicleId,
        originalJobOrderId: origin.finalizedOrigin.id,
        complaint,
        status: 'reported',
      }),
    );
    if (originalBookingId) {
      expect(storedBackJob.originalBookingId).toBe(originalBookingId);
    }

    const loadedCasesTable = page.locator('section.table-surface').filter({ hasText: 'Loaded Vehicle Cases' }).first();
    await expect(loadedCasesTable, 'Loaded Vehicle Cases table should show the created case.').toBeVisible();
    await expect(loadedCasesTable.getByText(/^BJ-/, { exact: false }).first()).toBeVisible();
    await expect(loadedCasesTable.getByText(vehicle.plateNumber ?? seededVehicle.plateNumber, { exact: false }).first()).toBeVisible();
    await expectRawUuidHidden(loadedCasesTable, createdBackJob.id, 'Back-job case table value');
    await expectRawUuidHidden(loadedCasesTable, origin.vehicleId, 'Vehicle table value');
    await expectRawUuidHidden(loadedCasesTable, origin.finalizedOrigin.id, 'Original job order table value');

    const detailBackJob = await apiGet(
      request,
      `/api/back-jobs/${createdBackJob.id}`,
      adviserSession.accessToken,
      'Load created back-job detail',
    );
    expect(detailBackJob).toEqual(
      expect.objectContaining({
        id: createdBackJob.id,
        customerUserId: customerSession.user.id,
        vehicleId: origin.vehicleId,
        originalJobOrderId: origin.finalizedOrigin.id,
        complaint,
      }),
    );

    const userVisibleLineageText = `${await detailPanel.innerText()}\n${await loadedCasesTable.innerText()}`;
    expect(
      userVisibleLineageText,
      'Back-Jobs table/detail should not expose raw UUIDs for the case, customer, vehicle, original work, or booking lineage.',
    ).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  });

  test('staff follows approved back-job through rework job order, QA release, and resolved outcome', async ({
    browser,
    request,
  }, testInfo) => {
    annotateSeverity(
      testInfo,
      'critical',
      'Objective 4 requires proof that approved back-jobs can become linked rework job orders and resolve after workshop and QA completion.',
    );

    await ensureLocalQaRuntime(request);

    const [customerSession, adviserSession] = await Promise.all([
      apiLogin(request, qaAccounts.customer),
      apiLogin(request, qaAccounts.adviser),
    ]);
    const origin = await findBackJobOrigin(request, customerSession, adviserSession);
    const vehicle = await getCustomerVehicle(request, customerSession, origin.vehicleId);
    const adminCustomer = await getAdminCustomer(request, adviserSession, customerSession.user.id);
    const runMarker = createRunMarker('PW-BACKJOB-FOLLOW');
    const originalBookingId =
      origin.finalizedOrigin.sourceType === 'booking' ? origin.finalizedOrigin.sourceId : undefined;
    const returnInspection = await createReturnInspection(request, adviserSession, {
      vehicleId: origin.vehicleId,
      bookingId: originalBookingId,
      inspectorUserId: adviserSession.user.id,
      runMarker,
    });
    const returnInspectionReference = formatReadableReturnInspectionReference(returnInspection, returnInspection.id);
    const backJob = await apiPost(
      request,
      '/api/back-jobs',
      adviserSession.accessToken,
      {
        ...buildBackJobPayload({
          customerSession,
          origin,
          complaint: `${runMarker}: verified returned concern needs rework follow-through.`,
          reviewNotes: `${runMarker}: return inspection completed before review approval.`,
          originalBookingId,
        }),
        returnInspectionId: returnInspection.id,
      },
      'Create approval-ready back-job for rework follow-through QA',
    );

    expect(backJob).toEqual(
      expect.objectContaining({
        status: 'reported',
        returnInspectionId: returnInspection.id,
        originalJobOrderId: origin.finalizedOrigin.id,
        vehicleId: origin.vehicleId,
      }),
    );

    await apiPostExpectFailure(
      request,
      '/api/job-orders',
      adviserSession.accessToken,
      {
        sourceType: 'back_job',
        sourceId: backJob.id,
        customerUserId: customerSession.user.id,
        vehicleId: origin.vehicleId,
        serviceAdviserUserId: adviserSession.user.id,
        serviceAdviserCode: 'QA-JO-SA',
        notes: `${runMarker}: negative check before approval.`,
        items: [
          {
            name: 'Warranty rework pre-approval block',
            description: 'This should remain blocked until approval.',
            estimatedHours: 1,
          },
        ],
        assignedTechnicianIds: [],
      },
      409,
      'Create rework job order before back-job approval',
    );

    const adviserContext = await browser.newContext();
    const adviserPage = await adviserContext.newPage();

    await test.step('Service adviser loads the back-job and confirms rework creation is blocked before approval', async () => {
      await loginStaffForBackJobs(adviserPage, qaAccounts.adviser);
      await loadBackJobDetailFromStaffUi(adviserPage, backJob.id);
      const detailPanel = adviserPage.locator('div.card').filter({ hasText: 'Live Back-Job Detail' }).first();
      await expect(detailPanel.locator('h2')).toContainText(/^BJ-/);
      await expect(detailPanel.getByText(adminCustomer?.displayName || adminCustomer?.email || qaAccounts.customer.email, { exact: false }).first()).toBeVisible();
      await expect(detailPanel.getByText(vehicle.plateNumber ?? seededVehicle.plateNumber, { exact: false }).first()).toBeVisible();
      const reworkCard = adviserPage.locator('section.card').filter({ hasText: 'Create Linked Rework Job Order' }).first();
      await expect(reworkCard.getByRole('button', { name: 'Create Rework Job Order' })).toBeDisabled();
    });

    await test.step('Service adviser moves the case from reported to approved for rework using return inspection evidence', async () => {
      const statusCard = adviserPage.locator('section.card').filter({ hasText: 'Review Status Update' }).first();
      await selectPortalOptionByText(adviserPage, statusCard, 'Choose next status', 'Inspected');
      await selectPortalOptionByText(adviserPage, statusCard, 'Choose return inspection', returnInspectionReference);
      await expectRawUuidHidden(adviserPage, returnInspection.id, 'Return inspection picker');
      await statusCard.getByLabel('Review notes').fill(`${runMarker}: return inspection reviewed by adviser.`);
      await saveBackJobStatusFromUi(adviserPage, 'inspected');

      await selectPortalOptionByText(adviserPage, statusCard, 'Choose next status', 'Approved For Rework');
      await statusCard.getByLabel('Review notes').fill(`${runMarker}: approved for linked rework job order.`);
      await saveBackJobStatusFromUi(adviserPage, 'approved_for_rework');

      const reworkCard = adviserPage.locator('section.card').filter({ hasText: 'Create Linked Rework Job Order' }).first();
      await expect(reworkCard.getByRole('button', { name: 'Create Rework Job Order' })).toBeEnabled();
    });

    let reworkJobOrder = null;
    await test.step('Service adviser creates and assigns the linked rework job order after approval', async () => {
      const reworkCard = adviserPage.locator('section.card').filter({ hasText: 'Create Linked Rework Job Order' }).first();
      await reworkCard.getByLabel('Work item name').fill(`Warranty rework ${runMarker}`);
      await reworkCard
        .getByLabel('Work item description')
        .fill('Repeat concern repair after completed original service.');
      await reworkCard.getByLabel('Rework notes').fill(`${runMarker}: created from approved back-job case.`);
      await reworkCard.getByLabel(/Queue Technician.*QA-JO-TEC/i).check();

      const createReworkResponsePromise = adviserPage.waitForResponse(
        (response) => response.request().method() === 'POST' && /\/api\/job-orders$/.test(response.url()),
        { timeout: 30_000 },
      );
      await reworkCard.getByRole('button', { name: 'Create Rework Job Order' }).click();
      reworkJobOrder = await expectJson(await createReworkResponsePromise, 'Create linked rework job order from Back-Jobs UI');

      expect(reworkJobOrder).toEqual(
        expect.objectContaining({
          sourceType: 'back_job',
          sourceId: backJob.id,
          customerUserId: customerSession.user.id,
          vehicleId: origin.vehicleId,
          status: 'assigned',
        }),
      );
      await expect(adviserPage.getByText('linked to this back-job', { exact: false })).toBeVisible();
    });

    const linkedBackJob = await pollUntil(
      'back-job to link the created rework job order',
      () => apiGet(request, `/api/back-jobs/${backJob.id}`, adviserSession.accessToken, 'Load linked back-job after rework create'),
      (entry) => entry?.reworkJobOrderId === reworkJobOrder?.id && entry?.status === 'in_progress',
      { timeoutMs: 30_000, intervalMs: 1_000 },
    );
    expect(linkedBackJob.reworkJobOrderId).toBe(reworkJobOrder.id);
    expect(linkedBackJob.status, 'Back-job should automatically move to in_progress once the linked rework job order is created.').toBe('in_progress');

    const returnInspectionVisibleAsRawId = await adviserPage
      .locator('div.card')
      .filter({ hasText: 'Live Back-Job Detail' })
      .first()
      .getByText(returnInspection.id, { exact: false })
      .isVisible()
      .catch(() => false);
    if (returnInspectionVisibleAsRawId) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'Back-Jobs readable lineage is fixed, but the detail panel still shows the linked return inspection as a raw UUID after approval.',
      });
    }

    const jobOrderId = reworkJobOrder.id;
    const jobOrderWorkDate =
      reworkJobOrder.workDate ?? String(reworkJobOrder.createdAt ?? new Date().toISOString()).slice(0, 10);
    const evidencePath = path.resolve('qa/playwright/fixtures/evidence/workshop-evidence.svg');

    const technicianContext = await browser.newContext();
    const technicianPage = await technicianContext.newPage();

    await test.step('Technician progresses the rework job order, uploads evidence, and sends it to QA', async () => {
      await loginStaff(technicianPage, qaAccounts.technician, '/admin/job-orders');
      await loadJobOrderById(technicianPage, {
        jobOrderId,
        technicianView: true,
        scheduledDate: jobOrderWorkDate,
        testInfo,
      });
      await progressJobOrderForQa(technicianPage, {
        evidencePath,
        progressMessage: `Technician rework progress recorded for ${runMarker}.`,
        testInfo,
      });
    });

    const headTechContext = await browser.newContext();
    const headTechPage = await headTechContext.newPage();

    await test.step('Head technician QA-releases the rework job order', async () => {
      await loginStaff(headTechPage, qaAccounts.headTechnician, '/admin/qa-audit');
      await recordQaVerdict(headTechPage, {
        jobOrderId,
        scheduledDate: jobOrderWorkDate,
        note: `Head technician QA release approved rework for ${runMarker}.`,
        testInfo,
      });
    });

    await test.step('Service adviser finalizes the rework and the back-job reaches resolved outcome', async () => {
      await finalizeAndRecordPayment(adviserPage, {
        jobOrderId,
        scheduledDate: jobOrderWorkDate,
        summary: `Rework finalized for back-job ${runMarker}.`,
        amount: 1500,
        reference: `PW-RW-${jobOrderId.slice(0, 8).toUpperCase()}`,
        testInfo,
      });

      const resolvedBackJob = await pollUntil(
        'back-job to resolve after linked rework finalization',
        () => apiGet(request, `/api/back-jobs/${backJob.id}`, adviserSession.accessToken, 'Load back-job after rework finalization'),
        (entry) => entry?.status === 'resolved' && entry?.reworkJobOrderId === jobOrderId,
        { timeoutMs: 30_000, intervalMs: 1_000 },
      );
      expect(resolvedBackJob.status).toBe('resolved');

      await adviserPage.goto(`${runtimeConfig.staffBaseUrl}/backjobs`);
      await adviserPage.getByRole('heading', { name: 'Review And Rework Workbench' }).waitFor();
      await loadBackJobDetailFromStaffUi(adviserPage, backJob.id);
      const detailPanel = adviserPage.locator('div.card').filter({ hasText: 'Live Back-Job Detail' }).first();
      await expect(detailPanel.getByText('Resolved', { exact: true })).toBeVisible();
      await expect(detailPanel.getByText('Customer-safe outcome', { exact: true })).toBeVisible();
    });

    await Promise.all([
      adviserContext.close(),
      technicianContext.close(),
      headTechContext.close(),
    ]);
  });
});
