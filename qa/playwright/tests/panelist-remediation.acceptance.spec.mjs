import { expect, test } from '@playwright/test';

import { annotateSeverity } from '../helpers/assertions.mjs';
import {
  apiLogin,
  ensureLocalQaRuntime,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs';
import { qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import { loginMobileCustomer, loginStaff } from '../helpers/flows.mjs';
import { expectNoHorizontalOverflow } from '../ui/uiAssertions.mjs';

const rawUuidPattern =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const uuidSuffixReferencePattern =
  /\b(?:VEH|JO|INS|BJ)-[A-Z0-9-]*-[A-F0-9]{8}\b/i;
const businessReferencePatterns = Object.freeze({
  vehicle: /^VEH-\d{4}-\d{6}$/,
  jobOrder: /^JO-\d{4}-\d{6}$/,
  insurance: /^INS-\d{4}-\d{6}$/,
  backJob: /^BJ-\d{4}-\d{6}$/,
});

const apiUrl = (pathname) => `${runtimeConfig.apiBaseUrl}${pathname}`;

async function readJson(response, label) {
  const body = await response.text();
  expect(response.ok(), `${label} failed with ${response.status()}: ${body}`).toBeTruthy();
  return body ? JSON.parse(body) : null;
}

async function getJson(request, pathname, accessToken, label) {
  return readJson(
    await request.get(apiUrl(pathname), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),
    label,
  );
}

function displayBusinessReference(value, pattern) {
  const normalized = String(value ?? '').trim();
  return normalized && (!pattern || pattern.test(normalized))
    ? normalized
    : 'Reference unavailable';
}

function collectObjectKeys(value, keys = new Set()) {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, keys);
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(child, keys);
  }
  return keys;
}

function assertCustomerPayloadSafe(payload, label) {
  const serialized = JSON.stringify(payload);
  expect(serialized, `${label} must not expose raw UUID values`).not.toMatch(rawUuidPattern);
  expect(serialized, `${label} must not expose UUID-derived business references`).not.toMatch(
    uuidSuffixReferencePattern,
  );

  const keys = collectObjectKeys(payload);
  for (const forbiddenKey of [
    'actorUserId',
    'assignedStaffId',
    'createdByUserId',
    'reviewedByUserId',
    'reviewNotes',
    'dedupeKey',
    'sourceId',
  ]) {
    expect(keys, `${label} must not expose ${forbiddenKey}`).not.toContain(forbiddenKey);
  }
}

test.describe('Panelist remediation contract and boundary evidence', () => {
  test('business references accept only persisted readable formats and use an explicit fallback', () => {
    const fixtures = [
      ['vehicle', 'VEH-2026-000001'],
      ['jobOrder', 'JO-2026-000001'],
      ['insurance', 'INS-2026-000001'],
      ['backJob', 'BJ-2026-000001'],
    ];

    for (const [kind, reference] of fixtures) {
      expect(reference).toMatch(businessReferencePatterns[kind]);
      expect(displayBusinessReference(reference, businessReferencePatterns[kind])).toBe(reference);
    }

    expect(displayBusinessReference(null, businessReferencePatterns.vehicle)).toBe('Reference unavailable');
    expect(displayBusinessReference('', businessReferencePatterns.vehicle)).toBe('Reference unavailable');
    expect(displayBusinessReference('JO-2026-000001-ABCDEF12', businessReferencePatterns.jobOrder)).toBe(
      'Reference unavailable',
    );
    expect(displayBusinessReference('JO-2026-550e8400', businessReferencePatterns.jobOrder)).toBe(
      'Reference unavailable',
    );
  });

  test('customer earning policy is active-rule only and explicitly excludes Accessories', async ({ request }, testInfo) => {
    test.setTimeout(60_000);
    annotateSeverity(
      testInfo,
      'high',
      'Customers must understand current loyalty earning rules without internal rule metadata or deferred Accessories claims.',
    );

    await ensureLocalQaRuntime(request, { requireMobile: false });
    const customer = await apiLogin(request, qaAccounts.customer);
    const policy = await getJson(
      request,
      '/api/loyalty/earning-policy',
      customer.accessToken,
      'Customer loyalty earning policy',
    );

    expect(policy).toEqual(expect.objectContaining({
      summary: expect.any(String),
      requirements: expect.any(Array),
      exclusions: expect.any(Array),
    }));
    expect(policy.requirements.every((entry) => Object.keys(entry).sort().join(',') === 'eligibility,formula')).toBe(true);
    expect(JSON.stringify(policy)).not.toMatch(/ruleId|audit|actor|promo/i);
    expect(JSON.stringify(policy.requirements)).not.toMatch(/accessor/i);
    expect(policy.exclusions.join(' ')).toMatch(/accessory purchases are not currently eligible/i);

    const unauthenticated = await request.get(apiUrl('/api/loyalty/earning-policy'));
    expect(unauthenticated.status()).toBe(401);
  });

  test('customer-safe timeline and insurance payloads do not expose operational metadata', async ({ request }, testInfo) => {
    test.setTimeout(90_000);
    annotateSeverity(
      testInfo,
      'critical',
      'Customer timeline and insurance responses must remain safe even when staff records contain internal IDs and notes.',
    );

    await ensureLocalQaRuntime(request, { requireMobile: false });
    const customer = await apiLogin(request, qaAccounts.customer);
    const vehicles = await getJson(
      request,
      `/users/${customer.user.id}/vehicles`,
      customer.accessToken,
      'Customer vehicles for privacy QA',
    );
    const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles?.items?.[0];
    expect(vehicle, 'The QA customer must have a vehicle for customer-safe payload checks.').toBeTruthy();
    expect(vehicle.publicReference).toMatch(businessReferencePatterns.vehicle);

    const [timeline, garageSummary, insurance] = await Promise.all([
      getJson(
        request,
        `/vehicles/${vehicle.id}/customer-timeline?limit=20`,
        customer.accessToken,
        'Customer lifecycle timeline',
      ),
      getJson(
        request,
        `/vehicles/${vehicle.id}/garage-summary`,
        customer.accessToken,
        'Customer Garage summary',
      ),
      getJson(
        request,
        '/insurance/inquiries/mine?limit=20',
        customer.accessToken,
        'Customer insurance inquiries',
      ),
    ]);

    assertCustomerPayloadSafe(timeline, 'Customer timeline');
    assertCustomerPayloadSafe(garageSummary, 'Customer Garage summary');
    assertCustomerPayloadSafe(insurance, 'Customer insurance inquiries');
    if (insurance?.items?.length) {
      for (const item of insurance.items) {
        expect(item.inquiryReference).toMatch(businessReferencePatterns.insurance);
      }
    }
  });

  test('staff and customer shells stay usable across required acceptance viewports', async ({ browser, request }, testInfo) => {
    test.setTimeout(180_000);
    annotateSeverity(
      testInfo,
      'high',
      'Critical staff and customer workspaces must remain readable and unobscured across the panelist review viewports.',
    );

    await ensureLocalQaRuntime(request, { requireMobile: true });

    for (const viewport of [
      { name: 'staff-desktop', width: 1440, height: 900, staff: true },
      { name: 'staff-tablet', width: 1024, height: 768, staff: true },
      { name: 'mobile-compact', width: 320, height: 640, staff: false },
      { name: 'mobile-standard', width: 390, height: 844, staff: false },
      { name: 'mobile-large', width: 430, height: 932, staff: false },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: !viewport.staff,
        isMobile: !viewport.staff,
      });

      try {
        const page = await context.newPage();
        if (viewport.staff) {
          await loginStaff(page, qaAccounts.adviser, '/admin/job-orders');
          await expect(page.getByRole('heading', { name: 'Job Orders' })).toBeVisible();
        } else {
          await proxyMobileApiTraffic(context);
          await loginMobileCustomer(page, qaAccounts.customer);
          await expect(page.getByText('Book Service', { exact: true })).toBeVisible();
        }
        await expectNoHorizontalOverflow(page);
        await testInfo.attach(`${viewport.name}-viewport.json`, {
          body: JSON.stringify({ viewport: { width: viewport.width, height: viewport.height }, status: 'passed' }),
          contentType: 'application/json',
        });
      } finally {
        await context.close();
      }
    }
  });

  test('unconfigured customer AI generation remains denied and review-gated', async ({ request }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(
      !process.env.QA_LIFECYCLE_SUMMARY_VEHICLE_ID,
      'Set QA_LIFECYCLE_SUMMARY_VEHICLE_ID to run the live AI generation boundary check.',
    );
    annotateSeverity(
      testInfo,
      'critical',
      'AI generation is staff-only, unavailable by default, and must never expose an unreviewed draft to customers.',
    );

    await ensureLocalQaRuntime(request, { requireMobile: false });
    const customer = await apiLogin(request, qaAccounts.customer);
    const vehicleId = process.env.QA_LIFECYCLE_SUMMARY_VEHICLE_ID;
    const response = await request.post(apiUrl(`/vehicles/${vehicleId}/lifecycle-summary/generate`), {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
    });
    expect(response.status()).toBe(403);
  });
});
