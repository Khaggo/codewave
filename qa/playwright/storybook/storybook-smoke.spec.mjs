import { expect, test } from '@playwright/test'

test('catalog exposes the representative UI stories', async ({ request }) => {
  const response = await request.get('/index.json')

  expect(response.ok()).toBeTruthy()
  const index = await response.json()
  const storyIds = Object.keys(index.entries ?? {})

  expect(storyIds).toContain('components-pageheader--default')
  expect(storyIds).toContain('components-confirmdialog--warning')
})

test('PageHeader renders in the isolated canvas', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=components-pageheader--default&viewMode=story',
  )

  await expect(page.getByRole('heading', { name: 'Job Orders' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Take next' })).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
})

test('PageHeader long content remains readable at compact mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto(
    '/iframe.html?id=components-pageheader--long-content&viewMode=story',
  )

  await expect(page.getByRole('heading', { name: /QA Audit for an unusually long/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue review' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('ConfirmDialog exposes accessible dialog controls', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=components-confirmdialog--warning&viewMode=story',
  )

  await expect(
    page.getByRole('dialog', { name: 'Release this job?' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Keep working' }),
  ).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Release job' })).toBeEnabled()
})

test('Storybook MCP endpoint is mounted', async ({ request }) => {
  const response = await request.get('/mcp', {
    headers: {
      accept: 'text/html',
    },
  })

  expect(response.ok()).toBeTruthy()
  expect(await response.text()).toMatch(/Storybook|MCP/i)
})
