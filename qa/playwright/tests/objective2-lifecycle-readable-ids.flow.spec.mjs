import path from 'node:path';

import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  createCustomerBooking,
  createCustomerVehicle,
  ensureLocalQaRuntime,
  getBooking,
  getAssignableTechnicianProfile,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  listCustomerBookings,
  listVehicleJobOrders,
  pollUntil,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import {
  confirmReservationPaymentFromBookings,
  createJobOrderFromHandoff,
  finalizeAndRecordPayment,
  loginMobileCustomer,
  loginStaff,
  loadJobOrderById,
  progressJobOrderForQa,
  recordQaVerdict,
  sendBookingToWorkshop,
  verifyInvoiceLookup,
} from '../helpers/flows.mjs';

const rawUuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const rawHashContextPattern =
  /\b(?:id|uuid|hash|vehicle|booking|job\s*order|invoice|transaction|case|reference|ref)\b[^\n\r]{0,28}?(?:#|:|\s)\s*([0-9a-f]{8})(?![0-9a-f-])/gi;
const uuidSuffixBusinessReferencePattern = /\b(?:INV|ORD|JO|BK|INSP|BJ|VEH)-[A-Z0-9-]*-[A-F0-9]{8}\b(?!-)/g;

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(response.ok(), `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function apiGet(request, pathName, accessToken, contextLabel) {
  const response = await request.get(`${runtimeConfig.apiBaseUrl}${pathName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return expectJson(response, contextLabel);
}

async function apiPost(request, pathName, accessToken, payload, contextLabel) {
  const response = await request.post(`${runtimeConfig.apiBaseUrl}${pathName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: payload,
  });

  return expectJson(response, contextLabel);
}

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

  throw new Error('No non-conflicting bookable date/time slot was available for Objective 2 lifecycle QA.');
}

async function createInsuranceRequestForVehicle(request, customerSession, vehicleId, runMarker) {
  return apiPost(
    request,
    '/api/insurance/inquiries',
    customerSession.accessToken,
    {
      userId: customerSession.user.id,
      vehicleId,
      purpose: 'claim',
      inquiryType: 'comprehensive',
      subject: `Objective 2 Insurance ${runMarker}`,
      description: `Objective 2 unified lifecycle proof insurance request for ${runMarker}.`,
      providerName: 'QA Insurance Provider',
      policyNumber: `OBJ2-${runMarker}`,
      notes: 'Created by Playwright Objective 2 lifecycle QA.',
    },
    'Create Objective 2 insurance request',
  );
}

function uniqueSamples(values, limit = 5) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].slice(0, limit);
}

function extractIdentifierLeaks(text) {
  const bodyText = String(text ?? '');
  const rawUuids = uniqueSamples(bodyText.match(rawUuidPattern) ?? []);
  const hashContextMatches = uniqueSamples([...bodyText.matchAll(rawHashContextPattern)].map((match) => match[0]));
  const uuidSuffixReferences = uniqueSamples(bodyText.match(uuidSuffixBusinessReferencePattern) ?? []);

  return {
    rawUuids,
    hashContextMatches,
    uuidSuffixReferences,
  };
}

async function sweepVisibleIdentifiers(page, surfaceName, testInfo) {
  const text = await page.evaluate(() => document.body?.innerText ?? '');
  const leaks = extractIdentifierLeaks(text);

  if (leaks.rawUuids.length) {
    addFinding(testInfo, {
      severity: 'high',
      summary: `${surfaceName} exposes visible raw UUID values: ${leaks.rawUuids.join(', ')}.`,
    });
  }

  if (leaks.hashContextMatches.length) {
    addFinding(testInfo, {
      severity: 'medium',
      summary: `${surfaceName} exposes hash-like ID fragments near user-facing labels: ${leaks.hashContextMatches.join(' | ')}.`,
    });
  }

  if (leaks.uuidSuffixReferences.length) {
    addFinding(testInfo, {
      severity: 'medium',
      summary: `${surfaceName} still shows business references with UUID-fragment-like suffixes: ${leaks.uuidSuffixReferences.join(', ')}.`,
    });
  }

  return leaks;
}

function assertTimelineOrdering(timelineEvents) {
  const outOfOrderPair = timelineEvents.find((event, index) => {
    if (index === 0) {
      return false;
    }

    return new Date(timelineEvents[index - 1].occurredAt).getTime() > new Date(event.occurredAt).getTime();
  });

  expect(outOfOrderPair, 'Lifecycle API should return events in chronological order.').toBeFalsy();
}

test('Objective 2 vehicle lifecycle unifies service, insurance, summary, and readable-ID proof', async ({
  browser,
  request,
}, testInfo) => {
  test.setTimeout(360_000);
  annotateSeverity(
    testInfo,
    'critical',
    'Objective 2 should show a unified customer-safe vehicle lifecycle and avoid raw UUID/hash-like identifiers on critical surfaces.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('OBJ2-LIFECYCLE');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const assignableTechnicianProfile = await getAssignableTechnicianProfile(request, adviserSession);
  const { services, timeSlots } = await getPublicBookingCatalog(request);

  expect(services.length, 'At least one active booking service is required for Objective 2 lifecycle QA.').toBeGreaterThan(0);
  expect(timeSlots.length, 'At least one active time slot is required for Objective 2 lifecycle QA.').toBeGreaterThan(0);

  const selectedService = services[0];
  const runPlateToken = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8);
  const temporaryVehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber: `O2${runPlateToken}`,
    make: 'Toyota',
    model: `Timeline ${runPlateToken.slice(-4)}`,
    year: 2022,
    color: 'Silver',
    notes: `${runMarker} temporary lifecycle QA vehicle`,
  });
  const temporaryVehicleLabel = `${temporaryVehicle.year} ${temporaryVehicle.make} ${temporaryVehicle.model}`;
  const { selectedTimeSlot, selectedDay } = await chooseBookingCandidate(request, customerSession, timeSlots, {
    vehicleId: temporaryVehicle.id,
  });
  const evidencePath = path.resolve('qa/playwright/fixtures/evidence/workshop-evidence.svg');

  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await proxyMobileApiTraffic(customerContext);
  const customerPage = await customerContext.newPage();

  let createdBooking = null;
  await test.step('Customer signs in on mobile and the live API creates the Objective 2 booking for the test vehicle', async () => {
    await loginMobileCustomer(customerPage, qaAccounts.customer);
    createdBooking = await createCustomerBooking(request, customerSession, {
      vehicleId: temporaryVehicle.id,
      timeSlotId: selectedTimeSlot.id,
      scheduledDate: selectedDay.scheduledDate,
      serviceIds: [selectedService.id],
      notes: runMarker,
    });
  });

  createdBooking = await pollUntil(
    `Objective 2 booking with marker ${runMarker}`,
    async () => {
      const bookings = await listCustomerBookings(request, customerSession);
      return bookings.find((entry) => entry?.id === createdBooking?.id || entry?.notes?.includes(runMarker));
    },
    Boolean,
  );
  const bookingId = createdBooking.id;
  const vehicleId = createdBooking.vehicleId;

  await test.step('Service adviser completes workshop handoff, job order, final invoice, and payment', async () => {
    const adviserContext = await browser.newContext();
    const adviserPage = await adviserContext.newPage();

    await loginStaff(adviserPage, qaAccounts.adviser, '/bookings');
    await confirmReservationPaymentFromBookings(adviserPage, {
      noteMarker: runMarker,
      scheduledDate: createdBooking.scheduledDate,
    });
    await sendBookingToWorkshop(adviserPage, {
      noteMarker: runMarker,
      scheduledDate: createdBooking.scheduledDate,
    });
    await sweepVisibleIdentifiers(adviserPage, 'Staff Bookings workshop handoff surface', testInfo);

    await createJobOrderFromHandoff(adviserPage, {
      bookingId,
      bookingReference: createdBooking.bookingReference,
      scheduledDate: createdBooking.scheduledDate,
      technicianSelectorText:
        assignableTechnicianProfile.code || assignableTechnicianProfile.fullName || assignableTechnicianProfile.id,
      noteMarker: runMarker,
      testInfo,
    });
    await sweepVisibleIdentifiers(adviserPage, 'Staff Job Orders create/assign surface', testInfo);

    const createdJobOrder = await pollUntil(
      `job order linked to Objective 2 booking ${bookingId}`,
      async () => {
        const jobOrders = await listVehicleJobOrders(request, adviserSession, vehicleId);
        return jobOrders.find((jobOrder) => jobOrder?.sourceId === bookingId);
      },
      Boolean,
    );

    const jobOrderId = createdJobOrder.id;
    const jobOrderWorkDate = createdJobOrder.workDate ?? createdBooking.scheduledDate;

    const technicianContext = await browser.newContext();
    const technicianPage = await technicianContext.newPage();
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
    await sweepVisibleIdentifiers(technicianPage, 'Adviser Job Orders progress/evidence surface', testInfo);

    const headTechContext = await browser.newContext();
    const headTechPage = await headTechContext.newPage();
    await loginStaff(headTechPage, qaAccounts.adviser, '/admin/qa-audit');
    await recordQaVerdict(headTechPage, {
      jobOrderId,
      scheduledDate: jobOrderWorkDate,
      note: `Adviser QA release approved for ${runMarker}.`,
      testInfo,
    });
    await sweepVisibleIdentifiers(headTechPage, 'Adviser QA Audit release surface', testInfo);

    await finalizeAndRecordPayment(adviserPage, {
      jobOrderId,
      scheduledDate: jobOrderWorkDate,
      summary: `Objective 2 workshop flow completed for ${runMarker}.`,
      amount: 2500,
      reference: `OBJ2-${bookingId.slice(0, 8).toUpperCase()}`,
      testInfo,
    });
    await verifyInvoiceLookup(adviserPage, jobOrderId, {
      scheduledDate: jobOrderWorkDate,
      account: qaAccounts.adviser,
      testInfo,
    });
    await sweepVisibleIdentifiers(adviserPage, 'Invoices & Orders service invoice/payment surface', testInfo);

    await Promise.all([adviserContext.close(), technicianContext.close(), headTechContext.close()]);

    const completedBooking = await pollUntil(
      `Objective 2 booking ${bookingId} to reach completed state`,
      async () => getBooking(request, customerSession, bookingId),
      (booking) => booking?.status === 'completed',
    );
    expect(completedBooking.status).toBe('completed');

    testInfo.attach('objective2-service-record', {
      body: JSON.stringify(
        {
          bookingId,
          bookingReference: createdBooking.bookingReference,
          jobOrderId,
          scheduledDate: createdBooking.scheduledDate,
          vehicleId,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });

  let insuranceInquiry = null;
  await test.step('Customer creates an insurance request for the same vehicle and staff sees it on web', async () => {
    insuranceInquiry = await createInsuranceRequestForVehicle(request, customerSession, vehicleId, runMarker);
    expect(insuranceInquiry?.vehicleId, 'Insurance inquiry should stay tied to the Objective 2 vehicle.').toBe(vehicleId);

    const staffInsurance = await apiGet(
      request,
      `/api/insurance/inquiries/${insuranceInquiry.id}`,
      adviserSession.accessToken,
      'Load Objective 2 insurance request from staff API',
    );
    expect(staffInsurance?.id).toBe(insuranceInquiry.id);
    expect(staffInsurance?.vehicleId).toBe(vehicleId);

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await loginStaff(staffPage, qaAccounts.adviser, '/bookings');
    await staffPage.goto(`${runtimeConfig.staffBaseUrl}/insurance`);
    await staffPage.getByRole('heading', { name: 'Live Staff Insurance Queue' }).waitFor();
    await staffPage.getByPlaceholder('Find by case, customer, or vehicle').fill(runMarker);
    await expect(staffPage.getByText(`Objective 2 Insurance ${runMarker}`, { exact: false }).first()).toBeVisible();
    await sweepVisibleIdentifiers(staffPage, 'Staff Insurance request surface', testInfo);
    await staffContext.close();
  });

  await test.step('Objective 2 lifecycle API exposes one ordered vehicle timeline', async () => {
    const timeline = await apiGet(
      request,
      `/api/vehicles/${vehicleId}/timeline`,
      customerSession.accessToken,
      'Load Objective 2 vehicle lifecycle timeline',
    );
    assertTimelineOrdering(timeline);

    const sourceTypes = new Set(timeline.map((event) => event?.sourceType));
    const eventTypes = new Set(timeline.map((event) => event?.eventType));

    expect(sourceTypes.has('booking'), 'Lifecycle timeline should include booking events for the tested vehicle.').toBeTruthy();
    expect(sourceTypes.has('job_order'), 'Lifecycle timeline should include job-order events for the tested vehicle.').toBeTruthy();
    expect(
      sourceTypes.has('quality_gate') || eventTypes.has('quality_gate_passed'),
      'Lifecycle timeline should include QA release / quality gate events for the tested vehicle.',
    ).toBeTruthy();
    expect(
      timeline.some((event) => event?.sourceId === bookingId),
      'Lifecycle timeline should include the freshly completed booking source.',
    ).toBeTruthy();

    const hasInsuranceTimelineEvidence = timeline.some((event) =>
      /insurance/i.test(`${event?.sourceType ?? ''} ${event?.eventType ?? ''} ${event?.notes ?? ''}`),
    );
    if (!hasInsuranceTimelineEvidence) {
      addFinding(testInfo, {
        severity: 'critical',
        summary:
          'Objective 2 unified lifecycle is still missing insurance request/history evidence: the same vehicle has a staff-visible insurance inquiry, but /api/vehicles/:id/timeline contains no insurance-related event.',
      });
    }

    const hasInvoiceOrPaymentTimelineEvidence = timeline.some((event) =>
      /invoice|payment|paid/i.test(`${event?.sourceType ?? ''} ${event?.eventType ?? ''} ${event?.notes ?? ''}`),
    );
    if (!hasInvoiceOrPaymentTimelineEvidence) {
      addFinding(testInfo, {
        severity: 'high',
        summary:
          'Objective 2 lifecycle timeline does not expose a clear invoice/payment milestone; billing completion is only indirectly implied by job-order finalization.',
      });
    }

    const latestSummary = await apiGet(
      request,
      `/api/vehicles/${vehicleId}/lifecycle-summary/latest`,
      customerSession.accessToken,
      'Load latest customer-visible lifecycle summary',
    );
    if (!latestSummary?.customerVisible) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'No approved customer-visible lifecycle summary was available for the tested vehicle during this Objective 2 pass.',
      });
    }

    testInfo.attach('objective2-lifecycle-api-snapshot', {
      body: JSON.stringify(
        {
          vehicleId,
          bookingId,
          insuranceInquiryId: insuranceInquiry?.id,
          timelineCount: timeline.length,
          sourceTypes: [...sourceTypes],
          eventTypes: [...eventTypes].slice(-40),
          latestSummaryStatus: latestSummary?.status ?? null,
          latestSummaryCustomerVisible: latestSummary?.customerVisible ?? null,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });

  await test.step('Customer opens Garage/lifecycle on mobile and sees service history plus reviewed summary', async () => {
    await customerPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
    const mobileSignInButton = customerPage.getByText('Sign in', { exact: true }).last();
    if (await mobileSignInButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await loginMobileCustomer(customerPage, qaAccounts.customer);
    }

    const garageEntry = customerPage.getByText('Garage', { exact: true }).last();
    await garageEntry.click();
    await expect(customerPage.getByText('Timeline', { exact: true }).first()).toBeVisible();

    const vehicleCard = customerPage.getByText(temporaryVehicle.plateNumber, { exact: true }).first();
    if (await vehicleCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await vehicleCard.scrollIntoViewIfNeeded();
      await vehicleCard.click();
    }

    await expect(customerPage.getByText('Booking created', { exact: true }).first()).toBeVisible();
    await expect(customerPage.getByText('Job order created', { exact: true }).first()).toBeVisible();
    await expect(customerPage.getByText(/Reviewed lifecycle summary|No customer-visible summary yet/i).first()).toBeVisible();
    await sweepVisibleIdentifiers(customerPage, 'Mobile Garage/lifecycle surface', testInfo);

    const lifecycleButton = customerPage.getByText('Lifecycle', { exact: true }).first();
    if (await lifecycleButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await lifecycleButton.click();
      await expect(customerPage.getByText('Maintenance & Repair Timeline', { exact: true })).toBeVisible();
      await expect
        .poll(
          async () =>
            customerPage
              .getByText(/Customer-visible reviewed summary|No customer-visible summary yet/i)
              .evaluateAll((nodes) =>
                nodes.some((node) => {
                  const element = node;
                  const style = window.getComputedStyle(element);
                  const rect = element.getBoundingClientRect();
                  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                }),
              ),
          {
            message: 'Mobile lifecycle detail should show the reviewed-summary section or the no-summary fallback.',
            timeout: 15_000,
          },
        )
        .toBeTruthy();
      await sweepVisibleIdentifiers(customerPage, 'Mobile vehicle lifecycle detail surface', testInfo);
    } else {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'Mobile Garage loaded the selected vehicle timeline, but the per-vehicle Lifecycle detail action was not visible during this pass.',
      });
    }
  });

  await customerContext.close();
});
