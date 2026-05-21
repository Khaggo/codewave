import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const headless = process.env.PW_HEADLESS !== 'false';
const staticMobileExportPath = path.resolve('mobile/.runtime/qa-mobile-web-export/index.html');
const useStaticMobileExport = !process.env.QA_MOBILE_BASE_URL && fs.existsSync(staticMobileExportPath);
const mobileBaseUrl = process.env.QA_MOBILE_BASE_URL ?? (useStaticMobileExport ? 'http://127.0.0.1:8095' : 'http://127.0.0.1:8090');

export default defineConfig({
  testDir: './qa/playwright/tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'qa/playwright/artifacts/html-report', title: 'AUTOCARE Flow QA Report' }],
    ['json', { outputFile: 'qa/playwright/artifacts/results.json' }],
    ['./qa/playwright/reporters/structured-qa-reporter.mjs', { outputFile: 'qa/playwright/artifacts/qa-summary.md' }],
  ],
  globalSetup: useStaticMobileExport ? './qa/playwright/support/global-setup.mjs' : undefined,
  use: {
    ...devices['Desktop Chrome'],
    headless,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  metadata: {
    suite: 'autocare-flow-qa',
    staffBaseUrl: process.env.QA_STAFF_BASE_URL ?? 'http://127.0.0.1:3002',
    mobileBaseUrl,
    apiBaseUrl: process.env.QA_API_BASE_URL ?? 'http://127.0.0.1:3000',
  },
});
