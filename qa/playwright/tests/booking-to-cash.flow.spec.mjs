import path from 'node:path';

import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  ensureLocalQaRuntime,
  getBooking,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  getReservationPayment,
  listCustomerBookings,
  listVehicleJobOrders,
  pollUntil,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, seededVehicle } from '../helpers/config.mjs';
import {
  confirmReservationPaymentFromBookings,
  createJobOrderFromHandoff,
  createMobileBooking,
  finalizeAndRecordPayment,
  loginMobileCustomer,
  loginStaff,
  loadJobOrderById,
  openTrackedBooking,
  progressJobOrderForQa,
  recordQaVerdict,
  sendBookingToWorkshop,
  verifyInvoiceLookup,
} from '../helpers/flows.mjs';

test('customer booking reaches completed history only after workshop, QA, and payment flow', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'Cross-role booking flow should remain consistent from mobile booking through billing completion.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('BOOKING-TO-CASH');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const { services, timeSlots } = await getPublicBookingCatalog(request);

  expect(services.length, 'At least one active booking service is required for QA flow coverage.').toBeGreaterThan(0);
  expect(timeSlots.length, 'At least one active booking time slot is required for QA flow coverage.').toBeGreaterThan(0);

  const selectedService = services[0];
  const existingCustomerBookings = await listCustomerBookings(request, customerSession);
  const seededVehicleId = existingCustomerBookings.find((booking) => booking?.vehicleId)?.vehicleId;
  const existingVehicleJobOrders = seededVehicleId
    ? await listVehicleJobOrders(request, adviserSession, seededVehicleId)
    : [];
  const existingJobOrderSourceIds = new Set(existingVehicleJobOrders.map((jobOrder) => jobOrder?.sourceId).filter(Boolean));
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
  const hasExistingJobOrderOnDate = (scheduledDate) =>
    existingCustomerBookings.some(
      (booking) => booking?.scheduledDate === scheduledDate && existingJobOrderSourceIds.has(booking?.id),
    );

  let selectedTimeSlot = null;
  let firstBookableDay = null;
  let conflictingAvailableDay = null;
  let mixedJobOrderQueueDate = null;

  for (const timeSlot of timeSlots) {
    const availability = await getPublicBookingAvailability(request, {
      timeSlotId: timeSlot.id,
      accessToken: customerSession.accessToken,
    });

    conflictingAvailableDay ??= (availability.days ?? []).find(
      (day) => day?.isBookable && hasActiveSameSlotBooking(day.scheduledDate, timeSlot.id),
    );

    const candidateDay = (availability.days ?? []).find((day) => {
      const matchingSlot = (day?.slots ?? []).find((slot) => slot?.timeSlotId === timeSlot.id);
      const existingJobOrderOnDate = hasExistingJobOrderOnDate(day.scheduledDate);
      if (day?.isBookable && matchingSlot?.isAvailable && existingJobOrderOnDate) {
        mixedJobOrderQueueDate ??= day.scheduledDate;
      }
      return (
        day?.isBookable &&
        matchingSlot?.isAvailable &&
        !hasActiveSameSlotBooking(day.scheduledDate, timeSlot.id)
      );
    });

    if (candidateDay) {
      selectedTimeSlot = timeSlot;
      firstBookableDay = candidateDay;
      break;
    }
  }

  if (conflictingAvailableDay) {
    addFinding(testInfo, {
      severity: 'high',
      summary:
        'Booking availability marks a date/slot as bookable even when this customer already has an active same-slot booking that the create endpoint rejects as a conflict.',
    });
  }
  expect(firstBookableDay, 'A non-conflicting bookable day is required to run the seeded booking flow.').toBeTruthy();
  expect(selectedTimeSlot, 'A non-conflicting active time slot is required to run the seeded booking flow.').toBeTruthy();

  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await proxyMobileApiTraffic(customerContext);
  const customerPage = await customerContext.newPage();

  await test.step('Customer signs in and submits a booking request from the mobile surface', async () => {
    await loginMobileCustomer(customerPage, qaAccounts.customer);
    await createMobileBooking(customerPage, {
      serviceName: selectedService.name,
      timeSlotLabel: selectedTimeSlot.label,
      scheduledDate: firstBookableDay.scheduledDate,
      noteMarker: runMarker,
    });
  });

  const createdBooking = await pollUntil(
    `booking with note marker ${runMarker}`,
    async () => {
      const bookings = await listCustomerBookings(request, customerSession);
      return bookings.find((entry) => entry?.notes?.includes(runMarker));
    },
    Boolean,
  );

  const bookingId = createdBooking.id;

  await test.step('Customer sees the reservation fee gate before staff confirmation', async () => {
    await openTrackedBooking(customerPage, createdBooking);
    await expect(customerPage.getByText('Reservation Fee', { exact: true })).toBeVisible();
    await expect(customerPage.getByText('Pay reservation fee', { exact: true })).toBeVisible();

    const reservationPayment = await getReservationPayment(request, customerSession, bookingId);
    if (!reservationPayment?.referenceNumber) {
      addFinding(testInfo, {
        severity: 'high',
        summary: 'Reservation fee record loaded without a reference number.',
      });
    }
  });

  const adviserContext = await browser.newContext();
  const adviserPage = await adviserContext.newPage();

  await test.step('Service adviser confirms reservation payment and hands booking to workshop', async () => {
    await loginStaff(adviserPage, qaAccounts.adviser, '/bookings');
    await confirmReservationPaymentFromBookings(adviserPage, {
      noteMarker: runMarker,
      scheduledDate: createdBooking.scheduledDate,
    });

    await pollUntil(
      `booking ${bookingId} to move into confirmed state`,
      async () => getBooking(request, customerSession, bookingId),
      (booking) => booking?.status === 'confirmed',
    );

    await sendBookingToWorkshop(adviserPage, {
      noteMarker: runMarker,
      scheduledDate: createdBooking.scheduledDate,
    });

    await pollUntil(
      `booking ${bookingId} to move into workshop handoff`,
      async () => getBooking(request, customerSession, bookingId),
      (booking) => booking?.status === 'in_service',
    );
  });

  await test.step('Customer booking is not yet completed after workshop handoff alone', async () => {
    const bookingAfterHandoff = await getBooking(request, customerSession, bookingId);
    expect(bookingAfterHandoff.status).not.toBe('completed');
  });

  await test.step('Service adviser creates the job order from the booking handoff and assigns the technician', async () => {
    await createJobOrderFromHandoff(adviserPage, {
      bookingId,
      bookingReference: createdBooking.bookingReference,
      scheduledDate: createdBooking.scheduledDate,
      technicianCode: qaAccounts.technician.staffCode,
      noteMarker: runMarker,
      testInfo,
      expectMixedSourceDate: mixedJobOrderQueueDate === createdBooking.scheduledDate,
    });
  });

  const createdJobOrder = await pollUntil(
    `job order linked to booking ${bookingId}`,
    async () => {
      const jobOrders = await listVehicleJobOrders(request, adviserSession, createdBooking.vehicleId);
      return jobOrders.find((jobOrder) => jobOrder?.sourceId === bookingId);
    },
    Boolean,
  );

  const jobOrderId = createdJobOrder.id;
  const jobOrderWorkDate = createdJobOrder.workDate ?? createdBooking.scheduledDate;
  const evidencePath = path.resolve('qa/playwright/fixtures/evidence/workshop-evidence.svg');

  const technicianContext = await browser.newContext();
  const technicianPage = await technicianContext.newPage();

  await test.step('Technician updates progress, attaches evidence, and sends the job to QA', async () => {
    await loginStaff(technicianPage, qaAccounts.technician, '/admin/job-orders');
    await loadJobOrderById(technicianPage, {
      jobOrderId,
      technicianView: true,
      scheduledDate: jobOrderWorkDate,
      testInfo,
    });
    await progressJobOrderForQa(technicianPage, {
      evidencePath,
      progressMessage: `Technician progress recorded for ${runMarker}.`,
      testInfo,
    });
  });

  const headTechContext = await browser.newContext();
  const headTechPage = await headTechContext.newPage();

  await test.step('Head technician records the QA release verdict without super-admin credentials', async () => {
    await loginStaff(headTechPage, qaAccounts.headTechnician, '/admin/qa-audit');
    await recordQaVerdict(headTechPage, {
      jobOrderId,
      scheduledDate: jobOrderWorkDate,
      note: `QA release approved for ${runMarker}.`,
      testInfo,
    });
  });

  await test.step('Booking is still not completed until adviser finalization and payment follow-through finish', async () => {
    const bookingBeforeBilling = await getBooking(request, customerSession, bookingId);
    expect(bookingBeforeBilling.status).not.toBe('completed');
  });

  await test.step('Service adviser finalizes invoice-ready work, records payment, and verifies invoice lookup', async () => {
    await finalizeAndRecordPayment(adviserPage, {
      jobOrderId,
      scheduledDate: jobOrderWorkDate,
      summary: `Completed seeded vehicle workshop flow for ${runMarker}.`,
      amount: 2500,
      reference: `PW-${bookingId.slice(0, 8).toUpperCase()}`,
      testInfo,
    });
    await verifyInvoiceLookup(adviserPage, jobOrderId, {
      scheduledDate: jobOrderWorkDate,
      testInfo,
    });
  });

  await test.step('Customer booking history reaches completed only after finance and service flow are done', async () => {
    const completedBooking = await pollUntil(
      `booking ${bookingId} to reach completed state`,
      async () => getBooking(request, customerSession, bookingId),
      (booking) => booking?.status === 'completed',
    );

    expect(completedBooking.status).toBe('completed');

    const completedVisibleWithoutRefresh = await customerPage
      .getByText('Completed', { exact: false })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!completedVisibleWithoutRefresh) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'Customer booking detail can remain visually stale after adviser finalization/payment; a manual refresh was needed before the mobile history showed completed.',
      });
    }

    await openTrackedBooking(customerPage, completedBooking, { forceRefresh: true, testInfo });
    await expect(customerPage.getByText('Completed', { exact: false }).first()).toBeVisible();
  });

  await Promise.all([
    customerContext.close(),
    adviserContext.close(),
    technicianContext.close(),
    headTechContext.close(),
  ]);
});
