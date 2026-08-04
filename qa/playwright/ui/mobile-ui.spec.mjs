import { expect, test } from '@playwright/test';

import {
  expectElementsNotToOverlap,
  expectMinimumTargetSize,
  expectNoHorizontalOverflow,
} from './uiAssertions.mjs';

const mobileSessionKey = '@autocare/mobile-session-v1';

const activeCustomer = {
  userId: 'customer-edge-1',
  email: 'edge.customer@example.com',
  role: 'customer',
  isActive: true,
  firstName: 'Edge',
  lastName: 'Customer',
  accessToken: 'edge-mobile-access',
  refreshToken: 'edge-mobile-refresh',
  ownedVehicles: [],
  addresses: [],
};

const resetMobileStorage = async (page) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
};

const openAuthenticatedFailureFixture = async (page) => {
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/auth/refresh') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'edge-mobile-access-refreshed',
          refreshToken: 'edge-mobile-refresh-refreshed',
          user: {
            id: activeCustomer.userId,
            email: activeCustomer.email,
            role: activeCustomer.role,
            isActive: true,
            firstName: activeCustomer.firstName,
            lastName: activeCustomer.lastName,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Temporarily unavailable for adversarial test' }),
    });
  });
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    mobileSessionKey,
    JSON.stringify({
      registeredAccount: activeCustomer,
      activeAccount: activeCustomer,
      pendingAccount: null,
      pendingOnboardingCompletion: null,
    }),
  ]);
  await page.reload();
};

test.beforeEach(async ({ page }) => {
  await resetMobileStorage(page);
});

test('tokenless remembered mobile storage cannot open a protected workspace', async ({ page }) => {
  await page.evaluate(([key, value]) => {
    window.localStorage.setItem(key, value);
  }, [mobileSessionKey, JSON.stringify({
    registeredAccount: {
      userId: 'remembered-customer',
      role: 'customer',
      firstName: 'Remembered',
      accessToken: null,
      refreshToken: null,
    },
    activeAccount: null,
    pendingAccount: null,
    pendingOnboardingCompletion: null,
  })]);
  await page.reload();

  await expect(page.getByText(/Book trusted care|Sign in|Get started/i).first()).toBeVisible();
  await expect(page.getByText(/Welcome back, Remembered/i)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('corrupted session JSON fails closed without a blank screen', async ({ page }) => {
  await page.evaluate((key) => window.localStorage.setItem(key, '{not-valid-json'), mobileSessionKey);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText(/Welcome back/i)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('registered onboarding data with no active account never impersonates a signed-in customer', async ({ page }) => {
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    mobileSessionKey,
    JSON.stringify({
      registeredAccount: activeCustomer,
      activeAccount: null,
      pendingAccount: null,
      pendingOnboardingCompletion: null,
    }),
  ]);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText(/Welcome back, Edge/i)).toHaveCount(0);
});

test('an expired persisted refresh token is cleared before protected UI renders', async ({ page }) => {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Expired refresh token' }),
  }));
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
    mobileSessionKey,
    JSON.stringify({
      registeredAccount: activeCustomer,
      activeAccount: activeCustomer,
      pendingAccount: null,
      pendingOnboardingCompletion: null,
    }),
  ]);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText(/Welcome back, Edge/i)).toHaveCount(0);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), mobileSessionKey);
  expect(stored.activeAccount).toBeNull();
});

test('blank mobile login focuses the first invalid field and keeps errors separated', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();

  const email = page.getByRole('textbox', { name: 'Email' });
  const password = page.getByRole('textbox', { name: 'Password' });
  await expect(email).toBeFocused();
  await expect(page.getByText('Enter your email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await expectElementsNotToOverlap(email, password);
  await expectMinimumTargetSize(page.getByRole('button'));
  await expectMinimumTargetSize(page.getByRole('link'));
  await expectNoHorizontalOverflow(page);
});

test('mobile sign-in network failure is actionable and hides internal configuration', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('customer@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword1!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Unable to reach AutoCare. Check your connection and try again.')).toBeVisible();
  await expect(page.getByText(/EXPO_PUBLIC_API_BASE_URL|127\.0\.0\.1:3000/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});

test('compact registration fields never overlap and every control remains touchable', async ({ page }) => {
  await page.getByRole('button', { name: 'Create account' }).click();

  const firstName = page.getByRole('textbox', { name: 'First Name' });
  const lastName = page.getByRole('textbox', { name: 'Last Name' });
  await expect(firstName).toBeVisible();
  await expect(lastName).toBeVisible();
  await expectElementsNotToOverlap(firstName, lastName);
  await expectMinimumTargetSize(page.getByRole('button'));
  await expectNoHorizontalOverflow(page);
});

test('compact public actions do not overlap and retain 44px targets', async ({ page }) => {
  await expect(page.getByText(/Cruisers Crib/i).first()).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargetSize(page.getByRole('button'));

  const chatbotAction = page.getByRole('button', { name: 'Ask AutoCare' });
  const overlapCount = await page.getByRole('button').evaluateAll((buttons, chatbot) => {
    const chatbotRect = chatbot.getBoundingClientRect();
    return buttons.filter((button) => {
      if (button === chatbot) return false;
      const rect = button.getBoundingClientRect();
      return !(
        rect.right <= chatbotRect.left ||
        rect.left >= chatbotRect.right ||
        rect.bottom <= chatbotRect.top ||
        rect.top >= chatbotRect.bottom
      );
    }).length;
  }, await chatbotAction.elementHandle());

  expect(overlapCount).toBe(0);
});

test('authenticated mobile modules recover from dependency failures without broken compact layout', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await openAuthenticatedFailureFixture(page);

  await expect(page.getByText('Book your next service')).toBeVisible();
  await expect(page.getByText('Completed services unavailable')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectMinimumTargetSize(page.getByRole('button'));

  if ((page.viewportSize()?.width ?? 1000) < 390) {
    const titleBox = await page.getByText('Book your next service').boundingBox();
    const actionBox = await page.getByRole('button', { name: 'Start Booking' }).boundingBox();
    expect(titleBox?.width).toBeGreaterThanOrEqual(200);
    expect(actionBox?.width).toBeGreaterThanOrEqual(200);
    expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(actionBox.y);
  }

  await page.getByRole('tab', { name: 'Garage' }).click();
  await expect(page.getByText('Lifecycle unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('tab', { name: 'Book' }).click();
  await expect(page.getByText('Booking discovery is unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('tab', { name: 'Insurance' }).click();
  await expect(page.getByText('Vehicles unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry loading vehicles' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(pageErrors).toEqual([]);
});
