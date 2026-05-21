import fs from 'node:fs';

import { expect } from '@playwright/test';

import { runtimeConfig } from './config.mjs';

const privateIpv4HostPattern = String.raw`(?:localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})`;
const mobileMainApiPattern = new RegExp(
  String.raw`^(?:https://api\.autocare-cc\.com|http://${privateIpv4HostPattern}:3000)/api/`,
);
const mobileEcommerceApiPattern = new RegExp(String.raw`^http://${privateIpv4HostPattern}:3001/`);

function buildApiUrl(path) {
  return `${runtimeConfig.apiBaseUrl}${path}`;
}

function buildMobileProxyCorsHeaders(request, responseHeaders = {}) {
  const origin = request.headers().origin ?? new URL(runtimeConfig.mobileBaseUrl).origin;

  return {
    ...responseHeaders,
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  };
}

async function fulfillMobileProxyRoute(route, targetBaseUrl) {
  const request = route.request();
  const sourceUrl = new URL(request.url());
  const targetUrl = `${targetBaseUrl}${sourceUrl.pathname}${sourceUrl.search}`;
  const proxyHeaders = { ...request.headers() };
  delete proxyHeaders.origin;
  delete proxyHeaders.referer;

  if (request.method() === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: buildMobileProxyCorsHeaders(request),
    });
    return;
  }

  try {
    const response = await route.fetch({ url: targetUrl, headers: proxyHeaders });
    await route.fulfill({
      response,
      headers: buildMobileProxyCorsHeaders(request, response.headers()),
    });
  } catch (error) {
    if (String(error?.message ?? '').includes('Request context disposed')) {
      return;
    }

    await route.fulfill({
      status: 502,
      headers: buildMobileProxyCorsHeaders(request, { 'content-type': 'application/json; charset=utf-8' }),
      body: JSON.stringify({
        message:
          targetBaseUrl === runtimeConfig.ecommerceApiBaseUrl
            ? 'Mobile ecommerce proxy could not reach the ecommerce service.'
            : 'Mobile API proxy could not reach the backend service.',
        error: error instanceof Error ? error.message : String(error),
      }),
    });
  }
}

export async function proxyMobileApiTraffic(context) {
  await context.route(mobileMainApiPattern, (route) => fulfillMobileProxyRoute(route, runtimeConfig.apiBaseUrl));
  await context.route(mobileEcommerceApiPattern, (route) =>
    fulfillMobileProxyRoute(route, runtimeConfig.ecommerceApiBaseUrl),
  );
}

async function expectJson(response, contextLabel) {
  const body = await response.text();

  expect(
    response.ok(),
    `${contextLabel} failed with ${response.status()}${body ? `: ${body}` : ''}`,
  ).toBeTruthy();

  return body ? JSON.parse(body) : null;
}

export async function ensureLocalQaRuntime(request, { requireMobile } = {}) {
  const healthResponse = await request.get(buildApiUrl('/api/health'));
  await expectJson(healthResponse, 'Backend health check');

  const staffResponse = await request.get(`${runtimeConfig.staffBaseUrl}/bookings`);
  expect(
    staffResponse.ok(),
    `Staff web is not reachable at ${runtimeConfig.staffBaseUrl}/bookings`,
  ).toBeTruthy();

  if (requireMobile) {
    if (runtimeConfig.mobileBaseUrl.startsWith('file:///')) {
      const localPath = decodeURIComponent(runtimeConfig.mobileBaseUrl.replace('file:///', '').replace(/\//g, '\\'));
      expect(
        fs.existsSync(localPath),
        `Mobile static export is missing at ${localPath}. Rebuild it before running the full flow.`,
      ).toBeTruthy();
    } else {
      const mobileResponse = await request.get(runtimeConfig.mobileBaseUrl);
      expect(
        mobileResponse.ok(),
        [
          `Mobile web runtime is not reachable at ${runtimeConfig.mobileBaseUrl}.`,
          'Start Expo Web with `cd mobile && npx expo start --web --port 8090 --clear`,',
          'or regenerate the static export at `mobile/.runtime/qa-mobile-web-export` so Playwright can auto-serve it.',
          'If mobile auth suddenly fails after an IP change, update `mobile/.env.local` and restart Expo.',
        ].join(' '),
      ).toBeTruthy();
    }
  }
}

export async function apiLogin(request, account) {
  const response = await request.post(buildApiUrl('/api/auth/login'), {
    data: {
      email: account.email,
      password: account.password,
    },
  });

  return expectJson(response, `Login for ${account.email}`);
}

export async function getPublicBookingCatalog(request) {
  const [servicesResponse, timeSlotsResponse] = await Promise.all([
    request.get(buildApiUrl('/api/services')),
    request.get(buildApiUrl('/api/time-slots')),
  ]);

  const [services, timeSlots] = await Promise.all([
    expectJson(servicesResponse, 'Load services'),
    expectJson(timeSlotsResponse, 'Load time slots'),
  ]);

  return {
    services: Array.isArray(services) ? services.filter((service) => service?.isActive !== false) : [],
    timeSlots: Array.isArray(timeSlots) ? timeSlots.filter((slot) => slot?.isActive !== false) : [],
  };
}

export async function getPublicBookingAvailability(request, { timeSlotId, accessToken }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  const params = new URLSearchParams({
    timeSlotId,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  });

  const response = await request.get(buildApiUrl(`/api/bookings/availability?${params.toString()}`), {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });
  return expectJson(response, 'Load booking availability');
}

export async function listCustomerBookings(request, session) {
  const response = await request.get(buildApiUrl(`/api/users/${session.user.id}/bookings`), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return expectJson(response, 'List customer bookings');
}

export async function getBooking(request, session, bookingId) {
  const response = await request.get(buildApiUrl(`/api/bookings/${bookingId}`), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return expectJson(response, `Get booking ${bookingId}`);
}

export async function getReservationPayment(request, session, bookingId) {
  const response = await request.get(buildApiUrl(`/api/bookings/${bookingId}/reservation-payment`), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return expectJson(response, `Get reservation payment for ${bookingId}`);
}

export async function listVehicleJobOrders(request, session, vehicleId) {
  const response = await request.get(buildApiUrl(`/api/job-orders/vehicles/${vehicleId}`), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  return expectJson(response, `List job orders for vehicle ${vehicleId}`);
}

export async function pollUntil(label, action, predicate, { timeoutMs = 75_000, intervalMs = 1_500 } = {}) {
  const start = Date.now();
  let lastValue = null;

  while (Date.now() - start < timeoutMs) {
    lastValue = await action();
    if (predicate(lastValue)) {
      return lastValue;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue, null, 2)}`);
}

export function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
