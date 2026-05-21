import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  ensureLocalQaRuntime,
  getPublicBookingAvailability,
  getPublicBookingCatalog,
  listCustomerBookings,
  proxyMobileApiTraffic,
  pollUntil,
} from '../helpers/api.mjs';
import { createRunMarker, qaAccounts } from '../helpers/config.mjs';
import { createMobileBooking, loginMobileCustomer } from '../helpers/flows.mjs';

test('customer mobile booking can submit more than one requested service in a single appointment', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'high',
    'Objective 1 requires customers to avail multiple services from the same mobile booking flow.',
  );

  await ensureLocalQaRuntime(request, { requireMobile: true });

  const runMarker = createRunMarker('MULTI-SVC');
  const customerSession = await apiLogin(request, qaAccounts.customer);
  const { services, timeSlots } = await getPublicBookingCatalog(request);
  const activeServices = services.filter((service) => service?.isActive !== false);

  test.skip(activeServices.length < 2, 'Need at least two active booking services to prove multi-service booking.');
  expect(timeSlots.length, 'At least one active booking time slot is required for mobile booking proof.').toBeGreaterThan(0);

  let selectedTimeSlot = null;
  let firstBookableDay = null;

  for (const timeSlot of timeSlots) {
    const availability = await getPublicBookingAvailability(request, {
      timeSlotId: timeSlot.id,
      accessToken: customerSession.accessToken,
    });
    const bookableDay = (availability.days ?? []).find((day) => day?.isBookable);

    if (bookableDay) {
      selectedTimeSlot = timeSlot;
      firstBookableDay = bookableDay;
      break;
    }
  }

  expect(firstBookableDay, 'A bookable day is required for multi-service booking proof.').toBeTruthy();

  const requestedServiceNames = activeServices.slice(0, 2).map((service) => service.name);
  const customerContext = await browser.newContext({ viewport: { width: 430, height: 932 } });
  await proxyMobileApiTraffic(customerContext);
  const customerPage = await customerContext.newPage();

  await loginMobileCustomer(customerPage, qaAccounts.customer);
  await createMobileBooking(customerPage, {
    serviceNames: requestedServiceNames,
    timeSlotLabel: selectedTimeSlot.label,
    scheduledDate: firstBookableDay.scheduledDate,
    noteMarker: runMarker,
  });

  const createdBooking = await pollUntil(
    `multi-service booking with note marker ${runMarker}`,
    async () => {
      const bookings = await listCustomerBookings(request, customerSession);
      return bookings.find((entry) => entry?.notes?.includes(runMarker));
    },
    Boolean,
  );

  const requestedServices = createdBooking?.requestedServices ?? [];
  expect(requestedServices.length, 'Created booking should persist more than one requested service.').toBeGreaterThanOrEqual(2);
  expect(requestedServices.map((entry) => entry?.service?.name)).toEqual(
    expect.arrayContaining(requestedServiceNames),
  );

  const hiddenServiceNames = [];
  for (const serviceName of requestedServiceNames) {
    const isVisible = await customerPage
      .getByText(serviceName, { exact: true })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!isVisible) {
      hiddenServiceNames.push(serviceName);
    }
  }

  if (hiddenServiceNames.length) {
    addFinding(testInfo, {
      severity: 'medium',
      summary: `Mobile booking stored multiple requested services, but the post-submit/history UI did not visibly show: ${hiddenServiceNames.join(', ')}.`,
    });
  }
});
