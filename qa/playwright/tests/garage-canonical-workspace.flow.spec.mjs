import { expect, test } from '@playwright/test'

import { annotateSeverity } from '../helpers/assertions.mjs'
import {
  ensureLocalQaRuntime,
  proxyMobileApiTraffic,
} from '../helpers/api.mjs'
import { qaAccounts } from '../helpers/config.mjs'
import { loginMobileCustomer } from '../helpers/flows.mjs'

test('Garage tab uses the canonical workspace and preserves contextual actions', async ({
  browser,
  request,
}, testInfo) => {
  annotateSeverity(
    testInfo,
    'high',
    'The Garage tab and standalone Garage route must share one customer workflow without duplicate navigation.',
  )

  await ensureLocalQaRuntime(request, { requireMobile: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })

  try {
    await proxyMobileApiTraffic(context)
    const page = await context.newPage()
    const browserErrors = []
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !message.text().startsWith('Failed to load resource:')
      ) {
        browserErrors.push(message.text())
      }
    })
    page.on('pageerror', (error) => {
      browserErrors.push(error.message)
    })

    await loginMobileCustomer(page, qaAccounts.customer)
    const initialGarageResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/users/') &&
        response.url().includes('/vehicles/garage'),
    )
    await page.getByRole('tab', { name: 'Garage' }).click()
    const initialGarageUrl = new URL((await initialGarageResponse).url())

    await expect(page.getByText('DIGITAL GARAGE', { exact: true })).toBeVisible()
    await expect(page.getByText('Your vehicles', { exact: true })).toBeVisible()
    await expect(page.getByText('Selected Vehicle', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add vehicle' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0)
    expect(initialGarageUrl.searchParams.get('limit')).toBe('3')
    await expect(page.getByText(/Showing 1-3 of \d+ vehicles/i)).toBeVisible()

    const nextGarageResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/vehicles/garage') &&
        new URL(response.url()).searchParams.has('cursor'),
    )
    await page.getByRole('button', { name: 'Next vehicles' }).click()
    await nextGarageResponse
    await expect(page.getByText(/Showing 4-6 of \d+ vehicles/i)).toBeVisible()

    const refreshResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes('/api/users/') &&
          response.url().includes('/vehicles'),
        { timeout: 15_000 },
      )
      .catch(() => null)
    await page.getByRole('tab', { name: 'Garage' }).click()
    expect(
      await refreshResponse,
      'Re-tapping the active Garage tab should refresh the canonical workspace.',
    ).toBeTruthy()

    const insuranceAction = page.locator('button[aria-label="Insurance"]')
    await expect(insuranceAction).toBeVisible()
    await insuranceAction.click()
    await expect(page.getByText('Current vehicle', { exact: true })).toBeVisible()
    expect(browserErrors, 'Garage navigation should not produce browser errors.').toEqual([])
  } finally {
    await context.close()
  }
})
