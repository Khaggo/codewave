import { defineConfig, devices } from '@playwright/test';

const headless = process.env.PW_HEADLESS !== 'false';

export default defineConfig({
  testDir: './qa/playwright/ui',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'qa/playwright/artifacts/ui-report' }],
  ],
  use: {
    headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'staff-desktop',
      testMatch: /staff-ui\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3002',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'staff-tablet',
      testMatch: /staff-ui\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3002',
        viewport: { width: 1024, height: 768 },
      },
    },
    ...[
      ['mobile-compact', 320, 640],
      ['mobile-standard', 390, 844],
      ['mobile-large', 430, 932],
    ].map(([name, width, height]) => ({
      name,
      testMatch: /mobile-ui\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:8090',
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      },
    })),
  ],
});
