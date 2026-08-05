import path from 'node:path';

import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  claimStaffWorkViaApi,
  createCustomerVehicle,
  ensureLocalQaRuntime,
  finalizeJobOrderViaApi,
  getBooking,
  getAssignableTechnicianProfile,
  getJobOrderById,
  getJobOrderInvoiceLookupById,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  getReservationPayment,
  listCustomerBookings,
  listVehicleJobOrders,
  pollUntil,
  proxyMobileApiTraffic,
  recordJobOrderInvoicePaymentViaApi,
  releaseCurrentStaffWorkViaApi,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, seededVehicle } from '../helpers/config.mjs';
import {
  confirmReservationPaymentFromBookings,
  createJobOrderFromHandoff,
  createMobileBooking,
  loginMobileCustomer,
  loginStaff,
  loadJobOrderById,
  openTrackedBooking,
  progressJobOrderForQa,
  recordQaVerdict,
  sendBookingToWorkshop,
} from '../helpers/flows.mjs';

const rawUuidPattern =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

test('customer booking reaches completed history only after workshop, QA, and payment flow', async ({
  browser,
  request,
}, testInfo) => {
  test.setTimeout(300_000);
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
  const assignableTechnicianProfile = await getAssignableTechnicianProfile(request, adviserSession);

  expect(services.length, 'At least one active booking service is required for QA flow coverage.').toBeGreaterThan(0);
  expect(timeSlots.length, 'At least one active booking time slot is required for QA flow coverage.').toBeGreaterThan(0);

  const selectedService = services[0];
  const existingCustomerBookings = await listCustomerBookings(request, customerSession);
  const runPlateToken = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8);
  const temporaryVehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber: `BK${runPlateToken}`,
    make: 'Toyota',
    model: `Flow ${runPlateToken.slice(-4)}`,
    year: 2022,
    color: 'Silver',
    notes: `${runMarker} temporary booking-to-cash vehicle`,
  });
  const selectedVehicleId = temporaryVehicle.id;
  const existingVehicleJobOrders = await listVehicleJobOrders(request, adviserSession, selectedVehicleId);
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
      vehicleId: selectedVehicleId,
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
      vehiclePlateNumber: temporaryVehicle.plateNumber,
      vehicleLabel: `${temporaryVehicle.year} ${temporaryVehicle.make} ${temporaryVehicle.model}`,
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
    await expect(customerPage.getByText('Pay Reservation Fee', { exact: true })).toBeVisible();

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
      technicianSelectorText:
        assignableTechnicianProfile.code || assignableTechnicianProfile.fullName || assignableTechnicianProfile.id,
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

  await test.step('Service adviser updates progress, attaches evidence, and sends the job to QA', async () => {
    await loginStaff(technicianPage, qaAccounts.adviser, '/admin/job-orders');
    await loadJobOrderById(technicianPage, {
      jobOrderId,
      scheduledDate: jobOrderWorkDate,
      testInfo,
    });
    await progressJobOrderForQa(technicianPage, {
      evidencePath,
      progressMessage: `Workshop progress recorded for ${runMarker}.`,
      testInfo,
    });
  });

  const headTechContext = await browser.newContext();
  const headTechPage = await headTechContext.newPage();

  await test.step('Service adviser records the QA release verdict without super-admin credentials', async () => {
    const qaTargetJobOrder = await getJobOrderById(request, adviserSession, jobOrderId);
    await loginStaff(headTechPage, qaAccounts.adviser, '/admin/qa-audit');
    await recordQaVerdict(headTechPage, {
      jobOrderReference:
        qaTargetJobOrder.sourceBookingReference || qaTargetJobOrder.jobOrderReference,
      scheduledDate: jobOrderWorkDate,
      note: `Adviser QA release approved for ${runMarker}.`,
      testInfo,
    });
  });

  await test.step('Booking is still not completed until adviser finalization and payment follow-through finish', async () => {
    const bookingBeforeBilling = await getBooking(request, customerSession, bookingId);
    expect(bookingBeforeBilling.status).not.toBe('completed');
  });

  await test.step('Service adviser finalizes invoice-ready work, records payment, and verifies invoice lookup', async () => {
    await releaseCurrentStaffWorkViaApi(
      request,
      adviserSession,
      'job_order',
      'Release unrelated auto-dispatch before claiming QA-cleared finalization work.',
    );
    const finalizationClaim = await claimStaffWorkViaApi(request, adviserSession, {
      queueType: 'job_order',
      entityType: 'job_order',
      entityId: jobOrderId,
    });
    const latestJobOrder = await getJobOrderById(request, adviserSession, jobOrderId);
    const paymentReference = `PW-${bookingId.slice(0, 8).toUpperCase()}`;
    const finalizedJobOrder = await finalizeJobOrderViaApi(
      request,
      adviserSession,
      jobOrderId,
      {
        summary: `Completed seeded vehicle workshop flow for ${runMarker}.`,
        amountPaid: 2500,
        paymentMethod: 'cash',
        paymentReference,
        receivedAt: new Date().toISOString(),
        expectedUpdatedAt: latestJobOrder.updatedAt,
      },
      {
        claimId: finalizationClaim.claim.id,
      },
    );

    const settledJobOrder =
      finalizedJobOrder?.invoiceRecord?.paymentStatus === 'paid'
        ? finalizedJobOrder
        : await recordJobOrderInvoicePaymentViaApi(request, adviserSession, jobOrderId, {
            amountPaidCents: 250000,
            paymentMethod: 'cash',
            reference: paymentReference,
            receivedAt: new Date().toISOString(),
            expectedUpdatedAt: finalizedJobOrder.updatedAt,
          });

    const invoiceLookup = await getJobOrderInvoiceLookupById(request, adviserSession, jobOrderId);
    expect(invoiceLookup?.invoiceRecord?.invoiceReference, 'Invoice lookup should return a readable service invoice reference.').toBeTruthy();
    expect(settledJobOrder?.invoiceRecord?.paymentStatus, 'Recorded service invoice should be marked paid after settlement.').toBe('paid');
    expect(invoiceLookup?.invoiceRecord?.paymentStatus, 'Invoice lookup should reflect the paid service invoice state.').toBe('paid');

    const invoicePdfResponse = await request.get(
      `${process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000'}/api/job-orders/${jobOrderId}/invoice/pdf`,
      {
        headers: {
          Authorization: `Bearer ${adviserSession.accessToken}`,
        },
      },
    );
    expect(invoicePdfResponse.ok(), 'Finalized invoice PDF should be downloadable by the owning staff workflow.').toBe(true);
    expect((invoicePdfResponse.headers()['content-type'] ?? '').toLowerCase()).toContain('application/pdf');
    const invoicePdfText = Buffer.from(await invoicePdfResponse.body()).toString('latin1');
    expect(invoicePdfText).toContain(invoiceLookup.invoiceRecord.invoiceReference);
    expect(invoicePdfText).not.toContain(jobOrderId);
    expect(invoicePdfText).not.toMatch(rawUuidPattern);

    if (!invoiceLookup?.invoiceRecord?.officialReceiptReference) {
      addFinding(testInfo, {
        severity: 'medium',
        summary: 'Service invoice lookup returned a paid invoice without an official receipt reference.',
      });
    }
    if (!invoiceLookup?.invoiceRecord?.invoiceReference?.startsWith('INV-SVC-')) {
      addFinding(testInfo, {
        severity: 'medium',
        summary: 'Service invoice lookup returned an unexpected invoice reference format after finalization.',
      });
    }
    if (!invoiceLookup?.invoiceRecord?.paymentReference) {
      addFinding(testInfo, {
        severity: 'medium',
        summary: 'Service invoice lookup returned a paid invoice without the recorded payment reference.',
      });
    }
    if (invoiceLookup?.jobOrderId !== jobOrderId) {
      addFinding(testInfo, {
        severity: 'high',
        summary: 'Invoice lookup resolved to a different job order than the one that was finalized in the booking-to-cash flow.',
      });
    }

    if (!(await adviserPage.getByRole('heading', { name: 'Invoices & Orders' }).isVisible().catch(() => false))) {
      await adviserPage.goto('http://127.0.0.1:3002/admin/invoices');
      await adviserPage.getByRole('heading', { name: 'Invoices & Orders' }).waitFor();
    }

    await expect(adviserPage.getByRole('heading', { name: 'Invoices & Orders' })).toBeVisible();
    if (!(await adviserPage.getByText(invoiceLookup.invoiceRecord.invoiceReference, { exact: false }).first().isVisible({ timeout: 5_000 }).catch(() => false))) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'Invoices & Orders opened successfully after paid finalization, but the just-paid invoice reference was not immediately visible in the current workspace view without additional selector interaction.',
      });
    }
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
  });

  await Promise.all([
    customerContext.close(),
    adviserContext.close(),
    technicianContext.close(),
    headTechContext.close(),
  ]);
});
