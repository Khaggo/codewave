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

  assert.ok(!source.includes('Open the daily schedule and booking queue.'))
  assert.ok(!source.includes('Open pending bookings'))
  assert.ok(!source.includes('Continue intake inspection'))
  assert.ok(!source.includes('View invoices'))
  assert.ok(!source.includes('QA review'))
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

  assert.ok(intakeView.includes('Check in arrivals and capture vehicle condition before handoff.'))
  assert.ok(intakeScreen.includes('Capture the visit, then record the vehicle condition.'))
  assert.ok(intakeScreen.includes('Review past records for the active vehicle.'))

  assert.ok(qa.includes('Review release checks, record verdicts, and keep overrides auditable.'))

  assert.ok(finance.includes('Review invoice-ready work, payment entries, and completion records.'))
  assert.ok(finance.includes('Focus on records that are ready for payment or invoice follow-through.'))
  assert.ok(finance.includes('Keep the active billing record in view before updating payment or completion follow-through.'))
})

test('service flow workspaces use queue-first copy and remove bulky dashboard wording', () => {
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrders.includes('Review active work, update progress, and prepare jobs for QA.'))
  assert.ok(jobOrders.includes('Focus on the live execution queue first.'))

  assert.ok(qa.includes('Review release checks, record verdicts, and keep overrides auditable.'))
  assert.ok(qa.includes('Focus on the jobs waiting for release review.'))

  assert.ok(finance.includes('Review invoice-ready work, payment entries, and completion records.'))
  assert.ok(finance.includes('Focus on records that are ready for payment or invoice follow-through.'))

  assert.ok(!jobOrders.includes('Choose a schedule date and refresh to load confirmed bookings.'))
  assert.ok(
    !qa.includes(
      'Review the validator summary before the head technician decides.',
    ),
  )
})

test('service workspaces use concise queue-first section labels', () => {
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrders.includes('Job Order Queue'))
  assert.ok(jobOrders.includes('Selected Job Order'))

  assert.ok(qa.includes('QA Queue'))
  assert.ok(qa.includes('Selected Audit'))

  assert.ok(finance.includes('Invoice & Order Queue'))
  assert.ok(finance.includes('Selected Record'))
})

test('qa audit workspace keeps release queue ahead of findings and verdict actions', () => {
  const source = read('frontend/src/screens/QAAuditWorkspace.js')

  const queueIndex = source.indexOf('QA Queue')
  const detailIndex = source.indexOf('Selected Audit')
  const blockingIndex = source.indexOf('Blocking Findings')
  const verdictIndex = source.indexOf('Verdict / Override')

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(blockingIndex, -1)
  assert.notEqual(verdictIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < blockingIndex)
  assert.ok(blockingIndex < verdictIndex)
})

test('job orders workspace keeps queue before detail actions', () => {
  const source = read('frontend/src/screens/JobOrderWorkbench.js')

  const queueIndex = source.indexOf('<p className="card-title">Job Order Queue</p>')
  const detailIndex = source.indexOf('<p className="card-title">Selected Job Order</p>', queueIndex + 1)
  const assignmentsIndex = source.indexOf('<p className="card-title">Assignments</p>', detailIndex + 1)
  const progressIndex = source.indexOf('<p className="card-title">Progress Updates</p>', assignmentsIndex + 1)
  const evidenceIndex = source.indexOf('<p className="card-title">Evidence</p>', progressIndex + 1)
  const finalizeIndex = source.indexOf('<p className="card-title">Finalize</p>', evidenceIndex + 1)

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(assignmentsIndex, -1)
  assert.notEqual(progressIndex, -1)
  assert.notEqual(evidenceIndex, -1)
  assert.notEqual(finalizeIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < assignmentsIndex)
  assert.ok(assignmentsIndex < progressIndex)
  assert.ok(progressIndex < evidenceIndex)
  assert.ok(evidenceIndex < finalizeIndex)
})

test('invoice workspace keeps record queue before payment details', () => {
  const source = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  const queueIndex = source.indexOf('Invoice & Order Queue')
  const detailIndex = source.indexOf('Selected Record')
  const paymentIndex = source.indexOf('Payment Entries')

  assert.notEqual(queueIndex, -1)
  assert.notEqual(detailIndex, -1)
  assert.notEqual(paymentIndex, -1)
  assert.ok(queueIndex < detailIndex)
  assert.ok(detailIndex < paymentIndex)
})

test('intake workspace source keeps the guided front-desk section order', () => {
  const intakeScreen = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')
  const sectionMarkers = [
    'title="Arrival"',
    'title="Visit Type"',
    'title="Customer Concern"',
    'title="Requirements"',
    'title="Arrival Inspection"',
    '<p className="card-title">Inspection History</p>',
    '<p className="card-title">Next Step Actions</p>',
  ]
  const indices = sectionMarkers.map((marker) => intakeScreen.indexOf(marker))

  for (const [index, marker] of sectionMarkers.entries()) {
    assert.notEqual(indices[index], -1, `Expected intake screen source to include "${marker}"`)
  }

  for (let index = 1; index < indices.length; index += 1) {
    assert.ok(
      indices[index - 1] < indices[index],
      `Expected "${sectionMarkers[index - 1]}" to appear before "${sectionMarkers[index]}"`,
    )
  }
})

test('intake workspace guidance stays concise after front-desk redesign', () => {
  const intakeScreen = read('frontend/src/screens/DigitalIntakeInspectionWorkspace.js')

  assert.ok(intakeScreen.includes('Capture the visit, then record the vehicle condition.'))
})

test('catalog, inventory, staff, and analytics workspaces use concise operational copy', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  assert.ok(catalog.includes('Publish and manage customer-visible marketplace products.'))
  assert.ok(inventory.includes('Track stock levels, restock needs, and item availability.'))
  assert.ok(staff.includes('Create accounts, manage access, and keep operations staffing usable.'))
  assert.ok(analytics.includes("Review today's workload, bottlenecks, and live operational signals."))
})

test('admin operations workspaces move live queues ahead of secondary editors and summaries', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  const catalogListIndex = catalog.indexOf('title="Published Products"')
  const catalogEditorIndex = catalog.indexOf('title="Create And Publish Product"')
  const inventoryListIndex = inventory.indexOf('aria-label="Inventory visibility table"')
  const inventoryDetailIndex = inventory.indexOf('title="Selected Product Detail"')
  const inventoryCoverageIndex = inventory.indexOf('title="Inventory Coverage"')
  const staffDirectoryIndex = staff.indexOf('Managed Account Directory')
  const staffProvisioningIndex = staff.indexOf('Provision Operations Accounts')
  const analyticsOperationsIndex = analytics.indexOf('Review booking-state counts from the operations snapshot.')
  const analyticsDashboardIndex = analytics.indexOf('Review derived sales signals from the latest snapshot.')

  assert.notEqual(catalogListIndex, -1)
  assert.notEqual(catalogEditorIndex, -1)
  assert.ok(catalogListIndex < catalogEditorIndex)

  assert.notEqual(inventoryListIndex, -1)
  assert.notEqual(inventoryDetailIndex, -1)
  assert.notEqual(inventoryCoverageIndex, -1)
  assert.ok(inventoryListIndex < inventoryDetailIndex)
  assert.ok(inventoryDetailIndex < inventoryCoverageIndex)

  assert.notEqual(staffDirectoryIndex, -1)
  assert.notEqual(staffProvisioningIndex, -1)
  assert.ok(staffDirectoryIndex < staffProvisioningIndex)

  assert.notEqual(analyticsOperationsIndex, -1)
  assert.notEqual(analyticsDashboardIndex, -1)
  assert.ok(analyticsOperationsIndex < analyticsDashboardIndex)
})

test('loyalty workspace stays concise', () => {
  const loyalty = read('frontend/src/screens/LoyaltyManager.js')

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
