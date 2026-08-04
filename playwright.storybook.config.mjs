import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './qa/playwright/storybook',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: 'qa/playwright/artifacts/storybook-report',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:6006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev:storybook:raw',
    url: 'http://127.0.0.1:6006/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
