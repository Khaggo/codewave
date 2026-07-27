import { test, expect } from '@playwright/test';

import { addFinding, annotateSeverity } from '../helpers/assertions.mjs';
import { ensureLocalQaRuntime, proxyMobileApiTraffic } from '../helpers/api.mjs';
import { qaAccounts, runtimeConfig } from '../helpers/config.mjs';
import { loginMobileCustomer, loginStaff } from '../helpers/flows.mjs';

const rawUuidPattern =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const contextualHashPattern =
  /\b(?:id|uuid|hash|vehicle|booking|job\s*order|invoice|transaction|case|reference|ref|product|customer)\b[^\n\r]{0,32}?(?:#|:|\s)\s*([0-9a-f]{8})(?![0-9a-f-])/gi;
const nakedHashPattern = /#[0-9a-f]{8}\b/gi;
const businessReferenceUuidSuffixPattern =
  /\b(?:INV|ORD|JO|BK|INSP|BJ|VEH|CASE)-[A-Z0-9-]*-([A-F0-9]{8})\b(?!-)/g;

const mobileTabs = [
  { label: 'Home', required: true },
  { label: 'Garage', required: true },
  { label: 'Book', required: true },
  { label: 'Insurance', required: true },
  { label: 'Rewards', required: true },
  { label: 'Shop', required: true },
];

const staffRoutes = [
  { path: '/bookings', label: 'Staff Bookings' },
  { path: '/admin/job-orders', label: 'Staff Job Orders' },
  { path: '/admin/qa-audit', label: 'Staff QA Audit' },
  { path: '/admin/invoices', label: 'Staff Invoices & Orders' },
  { path: '/insurance', label: 'Staff Insurance' },
  { path: '/backjobs', label: 'Staff Back-Jobs' },
  { path: '/admin/catalog', label: 'Staff Catalog Admin', dependsOnEcommerce: true },
  { path: '/admin/inventory', label: 'Staff Inventory', dependsOnEcommerce: true },
  { path: '/admin/services', label: 'Staff Service Management' },
  { path: '/loyalty', label: 'Staff Loyalty Management' },
  { path: '/shop', label: 'Staff Shop / Ecommerce Workspace', dependsOnEcommerce: true },
];

function uniqueSamples(values, limit = 10) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()))].slice(0, limit);
}

function hasHexLetter(value) {
  return /[a-f]/i.test(String(value ?? ''));
}

function extractIdentifierLeaks(text) {
  const bodyText = String(text ?? '');
  const rawUuids = uniqueSamples(bodyText.match(rawUuidPattern) ?? []);
  const contextualHashes = uniqueSamples(
    [...bodyText.matchAll(contextualHashPattern)]
      .filter((match) => hasHexLetter(match[1]))
      .map((match) => match[0]),
  );
  const nakedHashes = uniqueSamples(
    (bodyText.match(nakedHashPattern) ?? []).filter((match) => hasHexLetter(match)),
  );
  const uuidSuffixReferences = uniqueSamples(
    [...bodyText.matchAll(businessReferenceUuidSuffixPattern)]
      .filter((match) => !/^\d{8}$/.test(match[1]))
      .map((match) => match[0]),
  );

  return {
    rawUuids,
    contextualHashes,
    nakedHashes,
    uuidSuffixReferences,
  };
}

function hasLeaks(leaks) {
  return (
    leaks.rawUuids.length > 0 ||
    leaks.contextualHashes.length > 0 ||
    leaks.nakedHashes.length > 0 ||
    leaks.uuidSuffixReferences.length > 0
  );
}

async function visibleText(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function sweepVisibleIdentifiers(page, surfaceName, testInfo, coverage) {
  const text = await visibleText(page);
  const leaks = extractIdentifierLeaks(text);
  const status = hasLeaks(leaks) ? 'failed' : 'passed';

  coverage.push({
    surface: surfaceName,
    status,
    url: page.url(),
    leaks,
  });

  if (leaks.rawUuids.length) {
    addFinding(testInfo, {
      severity: 'high',
      surface: surfaceName,
      summary: `${surfaceName} exposes visible raw UUID values: ${leaks.rawUuids.join(', ')}.`,
    });
  }

  if (leaks.contextualHashes.length || leaks.nakedHashes.length || leaks.uuidSuffixReferences.length) {
    addFinding(testInfo, {
      severity: 'medium',
      surface: surfaceName,
      summary: `${surfaceName} exposes hash-like or UUID-fragment references where panelists expect readable business IDs.`,
      samples: {
        contextualHashes: leaks.contextualHashes,
        nakedHashes: leaks.nakedHashes,
        uuidSuffixReferences: leaks.uuidSuffixReferences,
      },
    });
  }
}

async function waitForSettledUi(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => null);
  await page.waitForTimeout(1_000);
}

async function gotoStaffSurface(page, route, ecommerceReachable, testInfo, coverage) {
  await page.goto(`${runtimeConfig.staffBaseUrl}${route.path}`);
  await waitForSettledUi(page);

  const bodyText = await visibleText(page);
  const unavailable =
    /runtime unavailable|failed to fetch|network error|ECONNREFUSED|service unavailable|could not load/i.test(
      bodyText,
    );

  if (route.dependsOnEcommerce && !ecommerceReachable) {
    addFinding(testInfo, {
      severity: 'medium',
      surface: route.label,
      summary:
        'Ecommerce runtime on 3001 was not reachable, so ecommerce-backed readable-ID coverage for this surface is partial.',
    });
  } else if (unavailable) {
    addFinding(testInfo, {
      severity: 'medium',
      surface: route.label,
      summary: `${route.label} showed a runtime/load warning during the readable-ID sweep.`,
    });
  }

  await sweepVisibleIdentifiers(page, route.label, testInfo, coverage);
}

async function openMobileTab(page, tab, testInfo, coverage) {
  if (tab.label === 'Home') {
    return true;
  }

  const tabButton = page.getByText(tab.label, { exact: true }).last();

  if (!(await tabButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
    coverage.push({
      surface: `Mobile ${tab.label}`,
      status: 'not-covered',
      reason: `${tab.label} tab was not visible after customer login.`,
    });

    if (tab.required) {
      addFinding(testInfo, {
        severity: 'medium',
        surface: `Mobile ${tab.label}`,
        summary: `Mobile ${tab.label} could not be included in the readable-ID sweep because the tab was not visible.`,
      });
    }
    return false;
  }

  await tabButton.click();
  await waitForSettledUi(page);
  return true;
}

async function withLoggedInMobileCustomer(browser, callback) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
  });
  await proxyMobileApiTraffic(context);

  const page = await context.newPage();
  await loginMobileCustomer(page, qaAccounts.customer);

  try {
    await callback(page);
  } finally {
    await context.close();
  }
}

async function sweepMobileTab(browser, tab, testInfo, coverage) {
  await withLoggedInMobileCustomer(browser, async (page) => {
    const opened = await openMobileTab(page, tab, testInfo, coverage);
    if (!opened) {
      return;
    }

    await sweepVisibleIdentifiers(page, `Mobile ${tab.label}`, testInfo, coverage);

    if (tab.label === 'Shop') {
      const shopOrdersTab = page.getByText('Orders', { exact: true }).last();
      if (await shopOrdersTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await shopOrdersTab.click();
        await waitForSettledUi(page);
        await sweepVisibleIdentifiers(page, 'Mobile Shop Orders', testInfo, coverage);
      }
    }

    if (tab.label === 'Garage') {
      const lifecycleAction = page.getByText('Lifecycle', { exact: true }).first();
      if (await lifecycleAction.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await lifecycleAction.click();
        await waitForSettledUi(page);
        await sweepVisibleIdentifiers(page, 'Mobile Vehicle Lifecycle Detail', testInfo, coverage);
      }
    }
  });
}

async function probeEcommerceRuntime(request) {
  const healthPaths = ['/api/health', '/health'];

  for (const healthPath of healthPaths) {
    const response = await request.get(`${runtimeConfig.ecommerceApiBaseUrl}${healthPath}`, {
      timeout: 5_000,
    }).catch(() => null);

    if (response?.ok()) {
      return true;
    }
  }

  return false;
}

test.describe('AUTOCARE broad readable-ID sweep', () => {
  test('critical customer and staff surfaces do not expose raw UUID/hash references', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(360_000);
    annotateSeverity(
      testInfo,
      'high',
      'Broad panel-readiness sweep for raw UUID/hash-like identifiers on critical customer and staff adviser surfaces.',
    );

    const coverage = [];

    await ensureLocalQaRuntime(request, { requireMobile: true });
    const ecommerceReachable = await probeEcommerceRuntime(request);

    if (!ecommerceReachable) {
      addFinding(testInfo, {
        severity: 'medium',
        surface: 'Runtime coverage',
        summary:
          'Ecommerce API was not reachable at 3001, so ecommerce-backed readable-ID checks are captured as partial coverage rather than full pass evidence.',
      });
    }

    await test.step('Customer mobile readable-ID sweep', async () => {
      for (const tab of mobileTabs) {
        await sweepMobileTab(browser, tab, testInfo, coverage);
      }
    });

    await test.step('Service adviser staff readable-ID sweep', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginStaff(page, qaAccounts.adviser, '/bookings');

      for (const route of staffRoutes) {
        await gotoStaffSurface(page, route, ecommerceReachable, testInfo, coverage);
      }

      await context.close();
    });

    await test.step('Adviser job-order workbench readable-ID sweep', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginStaff(page, qaAccounts.adviser, '/admin/job-orders');
      await sweepVisibleIdentifiers(page, 'Adviser Job Orders', testInfo, coverage);
      await context.close();
    });

    await test.step('Adviser QA Audit readable-ID sweep', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginStaff(page, qaAccounts.adviser, '/admin/qa-audit');
      await sweepVisibleIdentifiers(page, 'Adviser QA Audit', testInfo, coverage);
      await context.close();
    });

    await testInfo.attach('readable-id-sweep-coverage.json', {
      body: JSON.stringify(
        {
          runtime: runtimeConfig,
          ecommerceReachable,
          surfaces: coverage,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    const leakingSurfaces = coverage
      .filter((surface) => surface.status === 'failed')
      .map((surface) => ({
        surface: surface.surface,
        leaks: surface.leaks,
      }));

    expect(coverage.length, 'Readable-ID sweep should inspect at least one customer/staff surface.').toBeGreaterThan(
      0,
    );
    expect(leakingSurfaces, 'Critical workflow surfaces should not expose raw UUID/hash-like identifiers.').toEqual([]);
  });
});
