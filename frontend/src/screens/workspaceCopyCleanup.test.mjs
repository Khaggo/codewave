import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('dashboard workspace copy is concise', () => {
  const source = read('frontend/src/screens/Dashboard.js')

  assert.ok(source.includes('Review assigned work and keep repair progress current.'))
  assert.ok(source.includes('Manage booking, intake, job-order, QA, and finance work from one workspace.'))
  assert.ok(source.includes('Open a job order to update progress or review intake history.'))
  assert.ok(source.includes('Keep workshop updates current for the rest of the staff.'))

  assert.ok(
    !source.includes(
      'Use this workspace as the staff command center for booking review, intake coordination, job-order handoff, QA checks, and finance follow-through.',
    ),
  )
})

test('settings workspace copy stays one sentence', () => {
  const source = read('frontend/src/screens/SettingsWorkspace.js')

  assert.ok(source.includes('Review staff details and current account security controls.'))
})

test('intake, qa, and finance workspaces use short section descriptions', () => {
  const intakeView = read('frontend/src/screens/digitalIntakeInspectionWorkspaceView.mjs')
  const intakeScreen = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(intakeView.includes('Record vehicle condition before service begins.'))
  assert.ok(
    intakeScreen.includes(
      'Start from the customer, vehicle, and booking, then capture the vehicle&apos;s arrival condition before',
    ),
  )
  assert.ok(intakeScreen.includes('Load prior inspection records for the active vehicle.'))

  assert.ok(qa.includes('Review QA checks, record verdicts, and keep overrides auditable.'))

  assert.ok(finance.includes('Review service invoices, ecommerce orders, and aging analytics from one workspace.'))
  assert.ok(finance.includes('Review aging, payment guidance, and live billing lookups before detail review.'))
  assert.ok(finance.includes('Inspect loaded job orders for invoice and payment status.'))
})

test('catalog, booking-service, and inventory workspaces use one-sentence descriptions', () => {
  const shop = read('frontend/src/screens/ShopProductAdmin.js')
  const booking = read('frontend/src/components/BookingServiceAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(shop.includes('Create categories and publish storefront-ready catalog products.'))
  assert.ok(shop.includes('Create a category for product publishing.'))
  assert.ok(shop.includes('Publish products with fields that match the shared catalog store.'))

  assert.ok(booking.includes('Create booking categories and publish live booking services.'))
  assert.ok(booking.includes('Create a category before publishing services.'))
  assert.ok(booking.includes('Publish services with valid category records only.'))

  assert.ok(inventory.includes('Review live product visibility and planned inventory readiness.'))
  assert.ok(inventory.includes('Review current product visibility without stock counts.'))
  assert.ok(inventory.includes('Inspect current catalog metadata for the selected product.'))
  assert.ok(inventory.includes('Review which inventory capabilities are live or planned.'))
})

test('analytics and loyalty workspaces stay concise', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')
  const loyalty = read('frontend/src/screens/LoyaltyManager.js')

  assert.ok(analytics.includes('Inspect read-only analytics snapshots across operations and support domains.'))
  assert.ok(analytics.includes('Review derived sales signals from the latest snapshot.'))
  assert.ok(analytics.includes('Review insurance workload from the latest snapshot.'))
  assert.ok(analytics.includes('Review service demand from the latest dashboard snapshot.'))

  assert.ok(loyalty.includes('Manage rewards, earning rules, and loyalty analytics.'))
})

test('old verbose workspace descriptions are removed from targeted files', () => {
  const checks = [
    [
      'frontend/src/screens/Dashboard.js',
      'Use this workspace as the staff command center for booking review, intake coordination, job-order handoff, QA checks, and finance follow-through.',
    ],
    [
      'frontend/src/screens/QAAuditWorkspace.js',
      'Review automated pre-check summaries, let the head technician record the final pass or block verdict, and keep overrides auditable when a super admin must intervene.',
    ],
    [
      'frontend/src/screens/AdminAnalyticsWorkspace.js',
      'This hub keeps analytics read-only and derived so staff can inspect the real snapshot without mixing reporting with unrelated review placeholders.',
    ],
    [
      'frontend/src/screens/InventoryWorkspace.js',
      'Review live catalog visibility, inspect product metadata, and keep planned stock behavior clearly separated from the current read-only inventory surface.',
    ],
  ]

  for (const [target, oldCopy] of checks) {
    const source = read(target)
    assert.ok(!source.includes(oldCopy))
  }
})
