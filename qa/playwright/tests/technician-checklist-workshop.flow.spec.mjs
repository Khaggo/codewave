import path from 'node:path';

import { test, expect } from '@playwright/test';

import {
  apiLogin,
  createCustomerBooking,
  createCustomerVehicle,
  ensureLocalQaRuntime,
  getAssignableTechnicianProfile,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  listCustomerBookings,
  listVehicleJobOrders,
  pollUntil,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts } from '../helpers/config.mjs';
import {
  confirmReservationPaymentFromBookings,
  createJobOrderFromHandoff,
  loadJobOrderById,
  loginStaff,
  sendBookingToWorkshop,
} from '../helpers/flows.mjs';

async function chooseBookingCandidate(request, customerSession, timeSlots, { vehicleId } = {}) {
  const existingCustomerBookings = await listCustomerBookings(request, customerSession);
  const activeBookingStatuses = new Set(['pending', 'pending_payment', 'confirmed', 'rescheduled', 'in_service']);
  const hasActiveSameSlotBooking = (scheduledDate, timeSlotId) =>
    existingCustomerBookings.some((booking) => {
      const bookingTimeSlotId = booking?.timeSlotId ?? booking?.timeSlot?.id;
      return (
        activeBookingStatuses.has(booking?.status) &&
        booking?.scheduledDate === scheduledDate &&
        bookingTimeSlotId === timeSlotId
      );
    });

  for (const timeSlot of timeSlots) {
    const availability = await getPublicBookingAvailability(request, {
      timeSlotId: timeSlot.id,
      accessToken: customerSession.accessToken,
      vehicleId,
    });

    const day = (availability.days ?? []).find((candidateDay) => {
      const matchingSlot = (candidateDay?.slots ?? []).find((slot) => slot?.timeSlotId === timeSlot.id);
      return (
        candidateDay?.isBookable &&
        matchingSlot?.isAvailable &&
        !hasActiveSameSlotBooking(candidateDay.scheduledDate, timeSlot.id)
      );
    });

    if (day) {
      return { selectedTimeSlot: timeSlot, selectedDay: day };
    }
  }

  throw new Error('No non-conflicting bookable date/time slot was available for checklist-only workshop QA.');
}

test('adviser-owned workshop checklist flow proves PDF export, evidence guardrails, and submit locking', async ({
  page,
  request,
}) => {
  await ensureLocalQaRuntime(request);

  const runMarker = createRunMarker('CHK');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const assignableTechnicianProfile = await getAssignableTechnicianProfile(request, adviserSession);
  const { services, timeSlots } = await getPublicBookingCatalog(request);
  expect(services.length).toBeGreaterThan(0);
  expect(timeSlots.length).toBeGreaterThan(0);

  const selectedService = services[0];
  const temporaryVehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber: `TC${runMarker.replace(/[^A-Z0-9]/gi, '').slice(-6)}`,
    make: 'Toyota',
    model: `Checklist ${runMarker.slice(-4)}`,
    year: 2024,
    color: 'Black',
    notes: `${runMarker} checklist workshop QA vehicle`,
  });
  const { selectedTimeSlot, selectedDay } = await chooseBookingCandidate(request, customerSession, timeSlots, {
    vehicleId: temporaryVehicle.id,
  });

  const createdBooking = await createCustomerBooking(request, customerSession, {
    vehicleId: temporaryVehicle.id,
    timeSlotId: selectedTimeSlot.id,
    scheduledDate: selectedDay.scheduledDate,
    serviceIds: [selectedService.id],
    notes: runMarker,
  });
  const bookingId = createdBooking.id;
  const evidencePath = path.resolve('qa/playwright/fixtures/evidence/workshop-evidence.svg');

  await loginStaff(page, qaAccounts.adviser, '/bookings');
  await confirmReservationPaymentFromBookings(page, {
    noteMarker: runMarker,
    scheduledDate: createdBooking.scheduledDate,
  });
  await sendBookingToWorkshop(page, {
    noteMarker: runMarker,
    scheduledDate: createdBooking.scheduledDate,
  });

  await createJobOrderFromHandoff(page, {
    bookingId,
    bookingReference: createdBooking.bookingReference,
    scheduledDate: createdBooking.scheduledDate,
    technicianSelectorText:
      assignableTechnicianProfile.code || assignableTechnicianProfile.fullName || assignableTechnicianProfile.id,
    noteMarker: runMarker,
  });

  const createdJobOrder = await pollUntil(
    `checklist QA job order linked to booking ${bookingId}`,
    async () => {
      const jobOrders = await listVehicleJobOrders(request, adviserSession, temporaryVehicle.id);
      return jobOrders.find((jobOrder) => jobOrder?.sourceId === bookingId);
    },
    Boolean,
  );

  await loadJobOrderById(page, {
    jobOrderId: createdJobOrder.id,
    scheduledDate: createdJobOrder.workDate ?? createdBooking.scheduledDate,
  });

  await expect(page.getByText('Completion checklist', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Assignments$/i }).first().click();
  await expect(page.getByRole('button', { name: 'Checklist PDF' }).first()).toBeVisible();

  const checklistPdfResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new RegExp(`/api/job-orders/${createdJobOrder.id}/assignments/[^/]+/checklist\\.pdf$`).test(response.url()),
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Checklist PDF' }).first().click();
  const checklistPdfResponse = await checklistPdfResponsePromise;
  expect(checklistPdfResponse.ok(), `Checklist PDF export failed with ${checklistPdfResponse.status()}`).toBeTruthy();
  expect((checklistPdfResponse.headers()['content-type'] ?? '').toLowerCase()).toContain('pdf');
  expect((checklistPdfResponse.headers()['content-disposition'] ?? '').toLowerCase()).toContain('attachment;');
  await expect(page.getByText('Checklist PDF generated and downloaded for the selected technician profile.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /^Progress$/i }).first().click();
  const workItemCheckbox = page.locator('#job-order-stage-progress input[type="checkbox"]').first();
  expect(await workItemCheckbox.count(), 'At least one work-item checkbox is required for checklist-only workshop QA.').toBeGreaterThan(0);
  await workItemCheckbox.check();
  await page.getByRole('textbox', { name: 'Progress message' }).fill(`Checklist completion attempt for ${runMarker}.`);
  await page.getByRole('button', { name: 'Save Progress Entry - workshop' }).click();
  await expect(page.getByText(/Add work-item photo evidence before marking complete:/i)).toBeVisible();

  await page.getByRole('button', { name: /^Evidence$/i }).first().click();
  const uploadRoute = /\/api\/job-orders\/[^/]+\/photos\/upload$/;
  await page.route(uploadRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  if (await page.getByRole('button', { name: 'Use recommended target' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Use recommended target' }).click();
  }
  await page.locator('#job-order-stage-evidence input[type="file"]').setInputFiles(evidencePath);
  await expect(page.getByLabel('Selected file')).toHaveValue(/workshop-evidence\.svg/i);
  const uploadResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && uploadRoute.test(response.url()),
    { timeout: 30_000 },
  );
  const uploadButton = page.getByRole('button', { name: 'Upload Photo Evidence - workshop' });
  await uploadButton.click();
  await expect(uploadButton).toBeDisabled();
  const uploadResponse = await uploadResponsePromise;
  await page.unroute(uploadRoute);
  expect(uploadResponse.ok(), `Evidence upload failed with ${uploadResponse.status()}`).toBeTruthy();
  await expect(page.getByText(/Photo evidence uploaded and saved\./i)).toBeVisible();

  await page.getByRole('button', { name: /^Progress$/i }).first().click();
  const progressRoute = /\/api\/job-orders\/[^/]+\/progress$/;
  await page.route(progressRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.getByRole('textbox', { name: 'Progress message' }).fill(`Checklist completion saved for ${runMarker}.`);
  const saveResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && progressRoute.test(response.url()),
    { timeout: 30_000 },
  );
  const saveButton = page.getByRole('button', { name: 'Save Progress Entry - workshop' });
  await saveButton.click();
  await expect(saveButton).toBeDisabled();
  const saveResponse = await saveResponsePromise;
  await page.unroute(progressRoute);
  expect(saveResponse.ok(), `Checklist progress save failed with ${saveResponse.status()}`).toBeTruthy();
  await expect(page.getByText(/Progress entry saved/i)).toBeVisible();
});
