import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { expectNoHorizontalOverflow } from '../ui/uiAssertions.mjs';

const STAFF_BASE_URL = 'http://127.0.0.1:3002';
const ARTIFACT_DIRECTORY = path.resolve(
  'qa/playwright/artifacts/payment-return',
);
const NEXT_DEVELOPMENT_TOOLBAR_HOST = 'nextjs-portal';
const TARGETED_ACTION_SELECTOR = [
  'a[href]',
  'form[action]',
  'button[formaction]',
  'input[formaction]',
  '[data-href]',
  '[data-url]',
  '[data-route]',
].join(', ');

const VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'desktop-1440x900', width: 1440, height: 900 }),
  Object.freeze({ name: 'mobile-390x844', width: 390, height: 844 }),
]);

const BOOKING_ROUTES = Object.freeze([
  Object.freeze({
    name: 'booking-success',
    pathname: '/payments/success',
    heading: 'Payment return received',
    href: 'autocarecc://checkout/booking/success',
  }),
  Object.freeze({
    name: 'booking-cancel',
    pathname: '/payments/cancel',
    heading: 'Payment was not completed',
    href: 'autocarecc://checkout/booking/cancel',
  }),
]);

const ACCESSORY_ROUTES = Object.freeze([
  Object.freeze({
    name: 'accessory-success',
    pathname: '/accessories/payment/success',
    heading: 'Payment return received',
  }),
  Object.freeze({
    name: 'accessory-cancel',
    pathname: '/accessories/payment/cancel',
    heading: 'Payment was not completed',
  }),
]);

function observeUnexpectedBrowserFailures(page) {
  const consoleErrors = [];
  const failedHttpRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (/^https?:/i.test(request.url())) {
      failedHttpRequests.push(
        `${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'failed'})`,
      );
    }
  });
  page.on('response', (response) => {
    if (/^https?:/i.test(response.url()) && response.status() >= 400) {
      failedHttpRequests.push(`${response.status()} ${response.url()}`);
    }
  });

  return () => {
    expect(consoleErrors, 'unexpected browser console/page errors').toEqual([]);
    expect(failedHttpRequests, 'failed HTTP requests or responses').toEqual([]);
  };
}

async function expectInsideViewport(locator, viewport) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectHorizontallyInsideViewport(locator, viewport) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
}

async function expectNoForbiddenApplicationTargets(page) {
  const forbiddenTargets = await page.locator(TARGETED_ACTION_SELECTOR).evaluateAll(
    (elements, toolbarHost) => {
      function isInsideKnownDevelopmentToolbar(element) {
        let current = element;

        while (current) {
          if (current instanceof Element && current.matches(toolbarHost)) return true;
          const root = current.getRootNode();
          current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
        }

        return false;
      }

      return elements.flatMap((element) => {
        if (isInsideKnownDevelopmentToolbar(element)) return [];

        return ['href', 'action', 'formaction', 'data-href', 'data-url', 'data-route']
          .flatMap((attribute) => {
            const target = element.getAttribute(attribute);
            if (!target) return [];

            try {
              const resolvedTarget = new URL(target, window.location.href);
              if (resolvedTarget.origin !== window.location.origin) return [];

              return [{
                element: element.tagName.toLowerCase(),
                attribute,
                target,
                pathname: resolvedTarget.pathname,
              }];
            } catch {
              return [];
            }
          });
      });
    },
    NEXT_DEVELOPMENT_TOOLBAR_HOST,
  );

  expect(
    forbiddenTargets,
    'application content must not target root, login, or staff web routes',
  ).toEqual([]);
}

async function expectSentinelAbsentFromApplicationContent(page, sentinel) {
  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toContain(sentinel);

  const attributeLeaks = await page.locator('*').evaluateAll(
    (elements, options) => {
      function isInsideKnownDevelopmentToolbar(element) {
        let current = element;

        while (current) {
          if (current instanceof Element && current.matches(options.toolbarHost)) return true;
          const root = current.getRootNode();
          current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
        }

        return false;
      }

      return elements.flatMap((element) => {
        if (isInsideKnownDevelopmentToolbar(element)) return [];

        return [...element.attributes]
          .filter(({ name }) => (
            name === 'href'
            || name === 'action'
            || name === 'formaction'
            || name.startsWith('data-')
          ))
          .filter(({ value }) => value.includes(options.sentinel))
          .map(({ name, value }) => ({
            element: element.tagName.toLowerCase(),
            attribute: name,
            value,
          }));
      });
    },
    { sentinel, toolbarHost: NEXT_DEVELOPMENT_TOOLBAR_HOST },
  );

  expect(
    attributeLeaks,
    'forged provider values must not reach application links or data attributes',
  ).toEqual([]);
}

async function expectCardTopContentInsideViewport(page, viewport) {
  const card = page.locator('main > section');
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();

  expect(cardBox).not.toBeNull();
  expect(cardBox.x).toBeGreaterThanOrEqual(-1);
  expect(cardBox.y).toBeGreaterThanOrEqual(-1);
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
  await expectInsideViewport(card.locator(':scope > p').first(), viewport);
  await expectInsideViewport(card.getByRole('heading', { level: 1 }), viewport);
}

async function expectUsableAtTwoHundredPercentText(
  page,
  viewport,
  primaryContent,
  textScaleScreenshot,
) {
  const card = page.locator('main > section');
  const footer = card.locator(':scope > p').last();
  const originalRootFontSize = await page.evaluate(
    () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  const scalingStyle = await page.addStyleTag({
    content: 'html { font-size: 200% !important; }',
  });

  try {
    const scaledRootFontSize = await page.evaluate(
      () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    expect(scaledRootFontSize).toBeGreaterThanOrEqual(originalRootFontSize * 1.95);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expectNoHorizontalOverflow(page);
    await expectHorizontallyInsideViewport(card, viewport);
    await expectCardTopContentInsideViewport(page, viewport);
    if (textScaleScreenshot) {
      await saveViewportScreenshot(
        page,
        textScaleScreenshot.testInfo,
        viewport,
        `${textScaleScreenshot.routeName}-text-200`,
      );
    }

    await primaryContent.scrollIntoViewIfNeeded();
    await expectInsideViewport(primaryContent, viewport);
    await expectNoHorizontalOverflow(page);

    await footer.scrollIntoViewIfNeeded();
    await expectInsideViewport(footer, viewport);
    await expectNoHorizontalOverflow(page);
  } finally {
    await scalingStyle.evaluate((style) => style.remove());
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  const restoredRootFontSize = await page.evaluate(
    () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  expect(restoredRootFontSize).toBeCloseTo(originalRootFontSize, 1);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expectNoHorizontalOverflow(page);
}

async function saveViewportScreenshot(page, testInfo, viewport, routeName) {
  fs.mkdirSync(ARTIFACT_DIRECTORY, { recursive: true });
  const screenshotPath = path.join(
    ARTIFACT_DIRECTORY,
    `${viewport.name}-${routeName}.png`,
  );

  await page.screenshot({ path: screenshotPath });
  await testInfo.attach(`${viewport.name}-${routeName}`, {
    path: screenshotPath,
    contentType: 'image/png',
  });
}

async function openPublicReturnPage(page, route, sentinel) {
  const response = await page.goto(
    `${STAFF_BASE_URL}${route.pathname}?provider_reference=${sentinel}`,
  );

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${route.pathname.replaceAll('/', '\\/')}\\?`));
  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);
  await expect(page.getByText(sentinel, { exact: false })).toHaveCount(0);
  await expectSentinelAbsentFromApplicationContent(page, sentinel);
  await expectNoForbiddenApplicationTargets(page);
}

for (const viewport of VIEWPORTS) {
  test.describe(`public payment returns at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of BOOKING_ROUTES) {
      test(`${route.name} remains public, keyboard-first, and app-safe`, async ({ page }, testInfo) => {
        const assertNoBrowserFailures = observeUnexpectedBrowserFailures(page);
        const sentinel = `SENTINEL-${viewport.name}-${route.name}`;

        await openPublicReturnPage(page, route, sentinel);

        const action = page.getByRole('link', {
          name: 'Open booking status in the AUTOCARE app',
          exact: true,
        });
        await expect(action).toHaveCount(1);
        await expect(action).toHaveAttribute('href', route.href);
        expect(await action.evaluate((element) => element.tagName)).toBe('A');

        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await expectNoHorizontalOverflow(page);
        await expectInsideViewport(page.locator('main > section'), viewport);
        await expectInsideViewport(action, viewport);
        if (viewport.width === 390 && route.name === 'booking-cancel') {
          await expectCardTopContentInsideViewport(page, viewport);
        }
        await saveViewportScreenshot(page, testInfo, viewport, route.name);

        if (viewport.width === 390) {
          await expectUsableAtTwoHundredPercentText(
            page,
            viewport,
            action,
            route.name === 'booking-cancel' ? { testInfo, routeName: route.name } : null,
          );
        }

        await page.keyboard.press('Tab');
        await expect(action).toBeFocused();
        const focusStyle = await action.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            focusVisible: element.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: Number.parseFloat(style.outlineWidth),
          };
        });
        expect(focusStyle.focusVisible).toBe(true);
        expect(focusStyle.outlineStyle).toBe('solid');
        expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);

        await page.evaluate(() => {
          window.__paymentExternalProtocolAttempt = null;
          document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-primary-return-action]');
            if (!target) return;
            event.preventDefault();
            window.__paymentExternalProtocolAttempt = target.getAttribute('href');
          }, { capture: true, once: true });
        });
        await action.click();
        await expect.poll(
          () => page.evaluate(() => window.__paymentExternalProtocolAttempt),
        ).toBe(route.href);
        expect(new URL(page.url()).pathname).toBe(route.pathname);
        await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);

        assertNoBrowserFailures();
      });
    }

    for (const route of ACCESSORY_ROUTES) {
      test(`${route.name} stays public with customer-safe fallback guidance`, async ({ page }, testInfo) => {
        const assertNoBrowserFailures = observeUnexpectedBrowserFailures(page);
        const sentinel = `SENTINEL-${viewport.name}-${route.name}`;

        await openPublicReturnPage(page, route, sentinel);

        const main = page.getByRole('main');
        await expect(main).toHaveCount(1);
        await expect(main.getByText(/My accessory orders/i)).toBeVisible();
        await expect(main.getByRole('link')).toHaveCount(0);
        await expect(main.getByRole('button')).toHaveCount(0);
        await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);

        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await expectNoHorizontalOverflow(page);
        await expectInsideViewport(page.locator('main > section'), viewport);
        if (viewport.width === 390 && route.name === 'accessory-cancel') {
          await expectCardTopContentInsideViewport(page, viewport);
        }
        await saveViewportScreenshot(page, testInfo, viewport, route.name);

        if (viewport.width === 390) {
          await expectUsableAtTwoHundredPercentText(
            page,
            viewport,
            main.getByText(/My accessory orders/i),
            route.name === 'accessory-cancel' ? { testInfo, routeName: route.name } : null,
          );
        }

        assertNoBrowserFailures();
      });
    }
  });
}

test('public favicon is a non-empty PNG', async ({ request }) => {
  const response = await request.get(`${STAFF_BASE_URL}/favicon.ico`);

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});
