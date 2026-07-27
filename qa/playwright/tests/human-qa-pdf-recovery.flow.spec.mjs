import { expect, test } from '@playwright/test';

import { selectOptionContaining } from '../helpers/assertions.mjs';
import {
  apiLogin,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import {
  createRunMarker,
  qaAccounts,
  runtimeConfig,
} from '../helpers/config.mjs';
import {
  loadJobOrderById,
  loginMobileCustomer,
  loginStaff,
} from '../helpers/flows.mjs';

const apiBaseUrl = `${runtimeConfig.apiBaseUrl.replace(/\/$/, '')}/api`;

async function requestJson(path, { method, token, body, allowFailure = false } = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok && !allowFailure) {
    throw new Error(`${method ?? (body ? 'POST' : 'GET')} ${path} -> ${response.status}: ${text}`);
  }

  return { response, payload, text };
}

async function createTemporaryQaVehicle(customerSession, marker) {
  const plateToken = marker.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-7);
  const { payload } = await requestJson('/vehicles', {
    method: 'POST',
    token: customerSession.accessToken,
    body: {
      userId: customerSession.user.id,
      plateNumber: `PDF${plateToken}`,
      make: 'Toyota',
      model: 'Vios',
      year: 2022,
      color: 'Silver',
      notes: `${marker} temporary vehicle for human-QA recovery verification.`,
    },
  });

  return payload;
}

async function getAssignableTechnicianProfile(adviserSession) {
  const { payload } = await requestJson('/admin/technician-profiles', {
    token: adviserSession.accessToken,
  });
  const profile = Array.isArray(payload) ? payload.find((item) => item?.id && item?.isActive !== false) : null;

  expect(profile, 'At least one assignable technician profile is required for job-order operational flow.').toBeTruthy();
  return profile;
}

async function createBookingAvoidingConflicts({ request, customerSession, vehicleId, serviceId, timeSlots, notePrefix }) {
  let lastError = null;

  for (const slot of timeSlots) {
    const availability = await getPublicBookingAvailability(request, {
      timeSlotId: slot.id,
      accessToken: customerSession.accessToken,
      vehicleId,
    });

    for (const day of availability.days ?? []) {
      const matchingSlot = (day?.slots ?? []).find((entry) => entry?.timeSlotId === slot.id);
      if (!day?.isBookable || !matchingSlot?.isAvailable) {
        continue;
      }

      const scheduledDate = day.scheduledDate;
      const result = await requestJson('/bookings', {
        method: 'POST',
        token: customerSession.accessToken,
        allowFailure: true,
        body: {
          userId: customerSession.user.id,
          vehicleId,
          timeSlotId: slot.id,
          scheduledDate,
          serviceIds: [serviceId],
          notes: `${notePrefix} ${scheduledDate} ${slot.label}`,
        },
      });

      if (result.response.ok) {
        return { booking: result.payload, scheduledDate, timeSlot: slot };
      }

      lastError = `${result.response.status}: ${result.text}`;
    }
  }

  throw new Error(`Unable to create booking without conflict. Last error: ${lastError}`);
}

async function setupHumanQaRecoveryData(request) {
  const marker = createRunMarker('PDF-HUMAN-QA');
  const [customerSession, adviserSession] = await Promise.all([
    apiLogin(request, qaAccounts.customer),
    apiLogin(request, qaAccounts.adviser),
  ]);
  const [{ services, timeSlots }, vehicle] = await Promise.all([
    getPublicBookingCatalog(request),
    createTemporaryQaVehicle(customerSession, marker),
  ]);
  const activeServices = services.filter((service) => service.isActive !== false);
  const activeTimeSlots = timeSlots.filter((slot) => slot.isActive !== false);
  const service = activeServices.find((item) => !/body/i.test(item.name)) ?? activeServices[0];
  const bodyService = activeServices.find((item) => /body/i.test(item.name)) ?? null;

  expect(vehicle, 'Temporary QA vehicle is required.').toBeTruthy();
  expect(activeServices.length, 'Active booking services are required.').toBeGreaterThan(0);
  expect(activeTimeSlots.length, 'Active booking time slots are required.').toBeGreaterThan(0);
  const technicianProfile = await getAssignableTechnicianProfile(adviserSession);

  const { booking, scheduledDate } = await createBookingAvoidingConflicts({
    request,
    customerSession,
    vehicleId: vehicle.id,
    serviceId: service.id,
    timeSlots: activeTimeSlots,
    notePrefix: `${marker}-READY-FOR-QA`,
  });

  await requestJson(`/bookings/${booking.id}/reservation-payment/confirm`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: {
      provider: 'manual_counter',
      referenceNumber: `PDF-HUMAN-QA-RSV-${marker}`,
    },
  });

  await requestJson(`/bookings/${booking.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    allowFailure: true,
    body: { status: 'confirmed', reason: `${marker} confirmed for QA route verification.` },
  });

  const { payload: jobOrder } = await requestJson('/job-orders', {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      sourceType: 'booking',
      sourceId: booking.id,
      customerUserId: customerSession.user.id,
      vehicleId: vehicle.id,
      serviceAdviserUserId: adviserSession.user.id,
      serviceAdviserCode: adviserSession.user.staffCode ?? 'QA-JO-SA',
      notes: `${marker} ready-for-QA route verification job order.`,
      items: [
        {
          name: `${marker} QA route checklist item`,
          description: 'Created by QA to verify the Step 6 QA Audit route.',
        },
      ],
      assignments: [
        {
          technicianProfileId: technicianProfile.id,
          selectedSpecialty: technicianProfile.specialties?.[0] ?? 'general repair',
        },
      ],
    },
  });

  const firstItemId = jobOrder.items?.[0]?.id;
  await requestJson(`/job-orders/${jobOrder.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: { status: 'in_progress', reason: `${marker} started.` },
  });
  await requestJson(`/job-orders/${jobOrder.id}/photos`, {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      fileName: `${marker}.jpg`,
      fileUrl: `https://files.example.com/${marker}.jpg`,
      caption: `${marker} QA evidence photo.`,
      linkedEntityType: firstItemId ? 'work_item' : 'job_order',
      linkedEntityId: firstItemId,
    },
  });
  await requestJson(`/job-orders/${jobOrder.id}/progress`, {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      entryType: 'work_completed',
      message: `${marker} adviser-managed workshop work completed for Step 6 route verification.`,
      completedItemIds: firstItemId ? [firstItemId] : [],
    },
  });
  const { payload: readyJobOrder } = await requestJson(`/job-orders/${jobOrder.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: { status: 'ready_for_qa', reason: `${marker} handoff to QA.` },
  });

  const intakeNotes = [
    `${marker} CAPTURED INTAKE SNAPSHOT`,
    'Customer concern: vibration during idle after arrival.',
    'Current odometer (km): 45230',
    'Fuel level on arrival: 1/4',
    'Damage notes: front bumper scuff and left panel scratch.',
  ].join('\n');
  const { payload: inspection } = await requestJson(`/vehicles/${vehicle.id}/inspections`, {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      inspectionType: 'intake',
      status: 'completed',
      bookingId: booking.id,
      inspectorUserId: adviserSession.user.id,
      notes: intakeNotes,
      attachmentRefs: [`upload://intake/${marker}/front-bumper.jpg`],
      findings: [
        {
          category: 'body',
          label: `${marker} front bumper scuff`,
          severity: 'medium',
          notes: `${marker} finding note should remain visible in detail.`,
          isVerified: true,
        },
      ],
    },
  });

  const ongoingAttempt = await createBookingAvoidingConflicts({
    customerSession,
    vehicleId: vehicle.id,
    serviceId: service.id,
    timeSlots: activeTimeSlots,
    notePrefix: `${marker}-ONGOING-RECHECK`,
  }).then(
    (created) => ({ allowed: true, created }),
    (error) => ({ allowed: false, error: error.message }),
  );

  return {
    marker,
    vehicle,
    service,
    bodyService,
    scheduledDate,
    jobOrder: readyJobOrder,
    inspection,
    ongoingAttempt,
  };
}

test.describe('Human QA PDF recovery verification', () => {
  let data;

  test.beforeAll(async ({ request }) => {
    data = await setupHumanQaRecoveryData(request);
  });

  test('Job Orders Step 6 banner opens live QA Audit instead of 404', async ({ browser }) => {
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await loginStaff(staffPage, qaAccounts.adviser, '/bookings');

    await loadJobOrderById(staffPage, {
      jobOrderId: data.jobOrder.id,
      scheduledDate: data.scheduledDate,
    });
    await staffPage.getByText('Step 6 of 8', { exact: false }).first().waitFor();
    await staffPage.getByRole('button', { name: 'Open QA Audit' }).first().click();
    await staffPage.waitForURL(/\/admin\/qa-audit(?:$|[?#])/);
    await expect(staffPage.getByRole('heading', { name: 'QA Audit' })).toBeVisible();
    await expect(staffPage.getByText(/404|not found/i)).toHaveCount(0);
    await staffContext.close();
  });

  test('Intake Inspection detail shows captured snapshot and notes', async ({ browser }) => {
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await loginStaff(staffPage, qaAccounts.adviser, '/admin/intake-inspections');
    await expect(staffPage.getByRole('heading', { name: /Front-Desk Arrival Intake/i })).toBeVisible();
    await staffPage.getByRole('combobox', { name: 'Choose a customer', exact: true }).click();
    await staffPage.getByRole('option').filter({ hasText: 'Queue Customer' }).first().click();
    await staffPage.getByRole('combobox', { name: 'Choose a customer vehicle' }).click();
    await staffPage.getByRole('option').filter({ hasText: data.vehicle.plateNumber }).first().click();
    await staffPage.getByRole('button', { name: /Load Vehicle History/i }).click();
    await staffPage.getByRole('button').filter({ hasText: data.marker }).first().click();
    await expect(staffPage.getByText('Captured Intake Snapshot', { exact: true })).toBeVisible();
    await expect(staffPage.getByText('Current odometer (km): 45230', { exact: false }).last()).toBeVisible();
    await expect(staffPage.getByText(`${data.marker} finding note should remain visible`, { exact: false })).toBeVisible();
    await staffContext.close();
  });

  test('mobile Booking clearing services and active-tab refresh behavior works', async ({ browser }) => {
    const mobileContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    await proxyMobileApiTraffic(mobileContext);
    const mobilePage = await mobileContext.newPage();
    await loginMobileCustomer(mobilePage, qaAccounts.customer);

    await mobilePage.getByText('Book Service', { exact: true }).click();
    await expect(mobilePage.getByText('Service Booking', { exact: true })).toBeVisible();
    await expect(mobilePage.getByText('Step 1: Choose Services', { exact: true })).toBeVisible();
    await mobilePage.getByText(data.service.name, { exact: true }).first().click();
    await expect(mobilePage.getByText(data.service.name, { exact: true }).first()).toBeVisible();
    await mobilePage.getByText(data.service.name, { exact: true }).first().click();
    await expect(mobilePage.getByText('Choose one or more services', { exact: true })).toBeVisible();

    if (data.bodyService?.name) {
      const bodyText = await mobilePage.locator('body').innerText();
      const reviewIndex = bodyText.indexOf('Step 4: Review Booking');
      const reviewText = reviewIndex >= 0 ? bodyText.slice(reviewIndex, reviewIndex + 900) : bodyText;
      expect(reviewText).not.toContain(data.bodyService.name);
    }

    const bookRefresh = mobilePage
      .waitForResponse(
        (response) => response.url().includes('/api/services') || response.url().includes('/api/time-slots'),
        { timeout: 15_000 },
      )
      .catch(() => null);
    await mobilePage.getByText('Book', { exact: true }).last().click();
    expect(await bookRefresh, 'Re-tapping active Book tab should refresh booking data.').toBeTruthy();

    await mobilePage.getByText('Garage', { exact: true }).last().click();
    await expect(mobilePage.getByText(/Garage|Digital Garage|Owned vehicles/i).first()).toBeVisible();
    const garageRefresh = mobilePage
      .waitForResponse(
        (response) => response.url().includes('/api/users/') && response.url().includes('/vehicles'),
        { timeout: 15_000 },
      )
      .catch(() => null);
    await mobilePage.getByText('Garage', { exact: true }).last().click();
    expect(await garageRefresh, 'Re-tapping active Garage tab should refresh garage/lifecycle data.').toBeTruthy();
    await mobileContext.close();
  });

  test('booking is blocked while the same vehicle has an ongoing service job', async () => {
    expect(
      data.ongoingAttempt.allowed,
      data.ongoingAttempt.allowed
        ? `Booking while ongoing service is still allowed: created ${
            data.ongoingAttempt.created.booking.bookingReference ?? data.ongoingAttempt.created.booking.id
          } while ${data.jobOrder.jobOrderReference ?? data.jobOrder.id} is ready_for_qa.`
        : `Booking while ongoing service was blocked: ${data.ongoingAttempt.error}`,
    ).toBe(false);
  });

  test('Dashboard Insurance launcher opens insurance request home', async ({ browser }, testInfo) => {
    const mobileContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
    await proxyMobileApiTraffic(mobileContext);
    const mobilePage = await mobileContext.newPage();
    const pageErrors = [];
    mobilePage.on('pageerror', (error) => {
      pageErrors.push(error.stack || error.message);
    });

    await loginMobileCustomer(mobilePage, qaAccounts.customer);
    await mobilePage.getByText('Home', { exact: true }).last().click();
    await expect(mobilePage.getByText('Book Service', { exact: true })).toBeVisible();
    await mobilePage.getByText('Insurance', { exact: true }).first().click();
    await mobilePage.waitForTimeout(1_000);

    if (pageErrors.length) {
      await testInfo.attach('mobile-insurance-page-errors', {
        body: pageErrors.join('\n\n'),
        contentType: 'text/plain',
      });
    }

    await expect(mobilePage.getByText('Open request', { exact: true })).toBeVisible();
    await mobileContext.close();
  });
});
