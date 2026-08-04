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
  loginMobileCustomer,
  loginStaff,
  loadJobOrderById,
  openTrackedBooking,
  progressJobOrderForQa,
  recordQaVerdict,
  sendBookingToWorkshop,
} from '../helpers/flows.mjs';

const apiBaseUrl = process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000';
const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf8');

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(response.ok(), `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

async function apiGet(request, path, accessToken, contextLabel) {
  const response = await request.get(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return expectJson(response, contextLabel);
}

async function apiPost(request, path, accessToken, payload, contextLabel) {
  const response = await request.post(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: payload,
  });

  return expectJson(response, contextLabel);
}

async function createInsuranceClaimWithUploads(request, customerSession, runMarker) {
  const vehicles = await apiGet(
    request,
    `/api/users/${customerSession.user.id}/vehicles`,
    customerSession.accessToken,
    'Load customer vehicles for insurance QA',
  );
  const vehicle =
    vehicles.find((entry) => entry?.plateNumber === seededVehicle.plateNumber) ??
    vehicles.find((entry) => entry?.id);

  expect(vehicle, 'Customer needs at least one seeded vehicle for insurance QA.').toBeTruthy();

  const inquiry = await apiPost(
    request,
    '/api/insurance/inquiries',
    customerSession.accessToken,
    {
      userId: customerSession.user.id,
      vehicleId: vehicle.id,
      purpose: 'claim',
      inquiryType: 'comprehensive',
      subject: `Insurance QA ${runMarker}`,
      description: `Panel QA claim with OR/CR, policy, and police report uploads. ${runMarker}`,
      providerName: 'QA Insurance Provider',
      policyNumber: `POL-${runMarker}`,
      notes: 'Created by Playwright insurance multi-file QA.',
    },
    'Create insurance claim request',
  );

  const uploadDefinitions = [
    { documentType: 'or_cr', fileName: `${runMarker}-or-cr.pdf`, notes: 'OR/CR attached in the claim intake package.' },
    { documentType: 'policy', fileName: `${runMarker}-policy.pdf`, notes: 'Policy document attached in the claim intake package.' },
    {
      documentType: 'police_report',
      fileName: `${runMarker}-police-report.pdf`,
      notes: 'Police report attached in the claim intake package.',
    },
  ];

  let latestInquiry = inquiry;
  for (const upload of uploadDefinitions) {
    const response = await request.post(`${apiBaseUrl}/api/insurance/inquiries/${inquiry.id}/documents/upload`, {
      headers: {
        Authorization: `Bearer ${customerSession.accessToken}`,
      },
      multipart: {
        documentType: upload.documentType,
        notes: upload.notes,
        file: {
          name: upload.fileName,
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        },
      },
    });

    latestInquiry = await expectJson(response, `Upload ${upload.documentType} supporting file`);
  }

  return {
    vehicle,
    inquiry: latestInquiry,
    expectedDocumentTypes: uploadDefinitions.map((entry) => entry.documentType),
    expectedFileNames: uploadDefinitions.map((entry) => entry.fileName),
  };
}

async function getLoyaltySnapshot(request, customerSession, label) {
  const [account, transactions] = await Promise.all([
    apiGet(request, `/api/loyalty/accounts/${customerSession.user.id}`, customerSession.accessToken, `${label} account`),
    apiGet(
      request,
      `/api/loyalty/accounts/${customerSession.user.id}/transactions`,
      customerSession.accessToken,
      `${label} transactions`,
    ),
  ]);

  return {
    account,
    transactions: Array.isArray(transactions) ? transactions : [],
    pointsBalance: Number(account?.pointsBalance ?? 0),
  };
}

async function chooseBookingCandidate(request, customerSession, services, timeSlots, vehicleId) {
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
      return {
        selectedService: services[0],
        selectedTimeSlot: timeSlot,
        selectedDay: day,
      };
    }
  }

  throw new Error('No non-conflicting bookable date/time slot was available for loyalty QA.');
}

async function finalizeInvoiceWithoutPayment(page, { jobOrderId, scheduledDate, summary, testInfo }) {
  await loadJobOrderById(page, {
    jobOrderId,
    expectedStage: 'finalize',
    claimIfAvailable: true,
  });
  await page.getByRole('textbox', { name: 'Finalization summary' }).fill(summary);
  await page.getByRole('button', { name: 'Finalize Invoice-Ready Work - adviser/admin' }).click();
  await page.locator('.status-message').filter({ hasText: 'Invoice-ready record' }).waitFor();
}

async function recordManualPayment(page, { amount, reference }) {
  await page.getByRole('spinbutton', { name: 'Amount received (PHP)' }).fill(String(amount));
  await page.getByRole('textbox', { name: 'Payment reference' }).fill(reference);
  await page.getByRole('button', { name: 'Record Manual Payment - adviser/admin' }).click();
  await page.getByText('Invoice payment recorded', { exact: false }).waitFor();
}

test('insurance claim keeps OR/CR, policy, and police report on one request and staff can open every file', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'Insurance claim document handling must keep multiple supporting files on one request and make them openable from staff review.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('INSURANCE-MULTI-FILE');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const staffSession = await apiLogin(request, qaAccounts.adviser);
  const { inquiry, expectedDocumentTypes, expectedFileNames } = await createInsuranceClaimWithUploads(
    request,
    customerSession,
    runMarker,
  );

  expect(inquiry?.documents?.length, 'Customer upload response should keep all files on the same insurance request.').toBe(3);
  expect(new Set(inquiry.documents.map((document) => document.inquiryId))).toEqual(new Set([inquiry.id]));
  expect(inquiry.documents.map((document) => document.documentType).sort()).toEqual([...expectedDocumentTypes].sort());
  for (const expectedFileName of expectedFileNames) {
    expect(inquiry.documents.some((document) => document.fileName === expectedFileName)).toBeTruthy();
  }

  const staffInquiry = await apiGet(
    request,
    `/api/insurance/inquiries/${inquiry.id}`,
    staffSession.accessToken,
    'Load insurance claim from staff API',
  );

  expect(staffInquiry.documents?.length, 'Staff API should show all uploaded files on the same insurance request.').toBe(3);

  for (const document of staffInquiry.documents) {
    const fileResponse = await request.get(`${apiBaseUrl}/api/insurance/documents/${document.id}/file`, {
      headers: {
        Authorization: `Bearer ${staffSession.accessToken}`,
      },
    });
    expect(
      fileResponse.ok(),
      `Uploaded insurance file should stream from backend: ${document.fileName}`,
    ).toBeTruthy();
    expect(
      Number(fileResponse.headers()['content-length'] ?? (await fileResponse.body()).byteLength),
      `Uploaded insurance file should not be empty: ${document.fileName}`,
    ).toBeGreaterThan(0);
  }

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await loginStaff(staffPage, qaAccounts.adviser, '/bookings');
  await staffPage.goto('http://127.0.0.1:3002/insurance');
  await staffPage.getByRole('heading', { name: 'Live Staff Insurance Queue' }).waitFor();
  await staffPage.getByPlaceholder('Find by case, customer, or vehicle').fill(runMarker);
  const inquiryResult = staffPage.getByText(`Insurance QA ${runMarker}`, { exact: false }).first();
  await expect(inquiryResult).toBeVisible();
  await inquiryResult.click();
  await staffPage.getByRole('tab', { name: 'Documents' }).click();

  for (const expectedFileName of expectedFileNames) {
    await expect(staffPage.getByText(expectedFileName, { exact: true })).toBeVisible();
  }

  const openFileLinks = staffPage.getByRole('link', { name: 'Open file' });
  await expect(
    openFileLinks,
    'Staff insurance view should expose one open/download action for each uploaded supporting file.',
  ).toHaveCount(3);

  for (let index = 0; index < 3; index += 1) {
    const href = await openFileLinks.nth(index).getAttribute('href');
    expect(href, 'Staff insurance Open file action should have a target URL.').toBeTruthy();

    if (href.startsWith('blob:')) {
      const blobProbe = await staffPage.evaluate(async (url) => {
        const response = await fetch(url);
        const body = await response.arrayBuffer();

        return {
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type') ?? '',
          byteLength: body.byteLength,
        };
      }, href);

      expect(blobProbe.ok, `Blob-backed Open file action should be fetchable: ${href}`).toBeTruthy();
      expect(blobProbe.byteLength, `Blob-backed Open file action should not be empty: ${href}`).toBeGreaterThan(0);
      continue;
    }

    const resolvedUrl = new URL(href, 'http://127.0.0.1:3002').toString();
    const fileResponse = await request.get(resolvedUrl, {
      headers: {
        Authorization: `Bearer ${staffSession.accessToken}`,
      },
    });
    expect(fileResponse.ok(), `Uploaded insurance file should be openable/downloadable: ${resolvedUrl}`).toBeTruthy();
  }
});

test('loyalty points accrue only after paid service invoice, not reservation fee or invoice finalization alone', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'critical',
    'Loyalty must be tied to qualifying paid invoice events, not booking creation, reservation-fee payment, or unpaid finalization.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('LOYALTY-SERVICE-PAYMENT');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const adviserSession = await apiLogin(request, qaAccounts.adviser);
  const assignableTechnicianProfile = await getAssignableTechnicianProfile(request, adviserSession);
  const { services, timeSlots } = await getPublicBookingCatalog(request);

  expect(services.length, 'At least one active booking service is required for loyalty service-payment QA.').toBeGreaterThan(0);
  expect(timeSlots.length, 'At least one active time slot is required for loyalty service-payment QA.').toBeGreaterThan(0);

  const baselineLoyalty = await getLoyaltySnapshot(request, customerSession, 'Baseline loyalty');
  const runPlateToken = runMarker.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-8);
  const temporaryVehicle = await createCustomerVehicle(request, customerSession, {
    plateNumber: `LY${runPlateToken}`,
    make: 'Toyota',
    model: `Loyalty ${runPlateToken.slice(-4)}`,
    year: 2022,
    color: 'Blue',
    notes: `${runMarker} temporary loyalty vehicle`,
  });
  const { selectedService, selectedTimeSlot, selectedDay } = await chooseBookingCandidate(
    request,
    customerSession,
    services,
    timeSlots,
    temporaryVehicle.id,
  );

  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await proxyMobileApiTraffic(customerContext);
  const customerPage = await customerContext.newPage();

  await loginMobileCustomer(customerPage, qaAccounts.customer);
  const createdBooking = await createCustomerBooking(request, customerSession, {
    vehicleId: temporaryVehicle.id,
    timeSlotId: selectedTimeSlot.id,
    scheduledDate: selectedDay.scheduledDate,
    serviceIds: [selectedService.id],
    notes: runMarker,
  });
  const bookingId = createdBooking.id;

  await expect(customerPage.getByText('Book Service', { exact: true })).toBeVisible();
  await getReservationPayment(request, customerSession, bookingId);

  const adviserContext = await browser.newContext();
  const adviserPage = await adviserContext.newPage();
  await loginStaff(adviserPage, qaAccounts.adviser, '/bookings');
  await confirmReservationPaymentFromBookings(adviserPage, {
    noteMarker: runMarker,
    scheduledDate: createdBooking.scheduledDate,
  });

  const afterReservationFee = await getLoyaltySnapshot(request, customerSession, 'After reservation fee');
  expect(afterReservationFee.pointsBalance, 'Reservation-fee confirmation alone must not award loyalty points.').toBe(
    baselineLoyalty.pointsBalance,
  );

  await sendBookingToWorkshop(adviserPage, {
    noteMarker: runMarker,
    scheduledDate: createdBooking.scheduledDate,
  });

  await createJobOrderFromHandoff(adviserPage, {
    bookingId,
    bookingReference: createdBooking.bookingReference,
    scheduledDate: createdBooking.scheduledDate,
    technicianSelectorText:
      assignableTechnicianProfile.code || assignableTechnicianProfile.fullName || assignableTechnicianProfile.id,
    noteMarker: runMarker,
    testInfo,
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
  await loginStaff(technicianPage, qaAccounts.adviser, '/admin/job-orders');
  await loadJobOrderById(technicianPage, {
    jobOrderId,
    scheduledDate: jobOrderWorkDate,
    testInfo,
  });
  await progressJobOrderForQa(technicianPage, {
    evidencePath,
    progressMessage: runMarker,
    testInfo,
  });

  const headTechContext = await browser.newContext();
  const headTechPage = await headTechContext.newPage();
  await loginStaff(headTechPage, qaAccounts.adviser, '/admin/qa-audit');
  await recordQaVerdict(headTechPage, {
    jobOrderReference:
      createdJobOrder.sourceBookingReference ||
      createdJobOrder.jobOrderReference ||
      createdBooking.bookingReference,
    scheduledDate: jobOrderWorkDate,
    note: `Adviser QA release for ${runMarker}`,
    testInfo,
  });

  await finalizeInvoiceWithoutPayment(adviserPage, {
    jobOrderId,
    scheduledDate: jobOrderWorkDate,
    summary: `Invoice finalized before payment for ${runMarker}`,
    testInfo,
  });

  const bookingAfterUnpaidFinalization = await getBooking(request, customerSession, bookingId);
  const afterUnpaidFinalization = await getLoyaltySnapshot(request, customerSession, 'After unpaid invoice finalization');
  expect(
    afterUnpaidFinalization.pointsBalance,
    'Unpaid invoice finalization or booking completion alone must not award loyalty points.',
  ).toBe(baselineLoyalty.pointsBalance);

  if (bookingAfterUnpaidFinalization.status === 'completed') {
    addFinding(testInfo, {
      severity: 'medium',
      summary:
        'Booking moved to completed after invoice finalization before manual invoice payment; loyalty remained correct, but completed-history timing may still confuse financial completion proof.',
    });
  }

  await recordManualPayment(adviserPage, {
    amount: 2500,
    reference: runMarker,
  });

  const afterPaidInvoice = await pollUntil(
    'loyalty points to increase after paid service invoice',
    async () => getLoyaltySnapshot(request, customerSession, 'After paid service invoice'),
    (snapshot) => snapshot.pointsBalance > baselineLoyalty.pointsBalance,
    { timeoutMs: 45_000, intervalMs: 1_500 },
  );

  expect(afterPaidInvoice.pointsBalance, 'Paid service invoice should award loyalty points from an active rule.').toBeGreaterThan(
    baselineLoyalty.pointsBalance,
  );
  expect(
    afterPaidInvoice.transactions.some(
      (transaction) => transaction?.sourceType === 'service_payment' && Number(transaction?.pointsDelta ?? 0) > 0,
    ),
    'Loyalty transaction history should include a positive service_payment accrual after paid invoice.',
  ).toBeTruthy();
});
