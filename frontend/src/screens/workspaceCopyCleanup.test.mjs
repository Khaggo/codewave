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

test('booking-service and inventory workspaces use one-sentence descriptions', () => {
  const booking = read('frontend/src/components/BookingServiceAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(booking.includes('Create booking categories and publish live booking services.'))
  assert.ok(booking.includes('Create a category before publishing services.'))
  assert.ok(booking.includes('Publish services with valid category records only.'))

  assert.ok(inventory.includes('Manage stock levels, thresholds, and item availability for catalog products.'))
  assert.ok(inventory.includes('Search existing catalog products and act on the live stock queue.'))
  assert.ok(inventory.includes('Review the selected product before updating stock or threshold settings.'))
  assert.ok(inventory.includes('Record a live stock change for the selected product.'))
  assert.ok(inventory.includes('Review the latest stock changes for this product.'))
})

test('catalog admin uses concise operational copy', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('Publish and manage customer-visible marketplace products.'))
})

test('catalog admin keeps published products ahead of the editor form', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  const catalogListIndex = catalog.indexOf('title="Published Products"')
  const catalogDetailIndex = catalog.indexOf('title="Selected Product"')
  const catalogEditorIndex = catalog.indexOf('title="Publishing Controls"')

  assert.notEqual(catalogListIndex, -1)
  assert.notEqual(catalogDetailIndex, -1)
  assert.notEqual(catalogEditorIndex, -1)
  assert.ok(catalogListIndex < catalogEditorIndex)
  assert.ok(catalogListIndex < catalogDetailIndex)
  assert.ok(catalogDetailIndex < catalogEditorIndex)
})

test('catalog admin uses marketplace publishing header copy', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('eyebrow="Marketplace publishing"'))
  assert.ok(catalog.includes('title="Catalog Admin"'))
  assert.ok(catalog.includes('Publish and manage customer-visible marketplace products.'))
  assert.ok(catalog.includes('Search published products'))
  assert.ok(catalog.includes('Choose a product from the list to review publishing details.'))
})

test('catalog admin keeps stock ownership in inventory', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('Manage Stock'))
  assert.ok(catalog.includes('Inventory owns stock updates.'))
  assert.ok(catalog.includes('Set stock later from Inventory.'))
  assert.ok(!catalog.includes('catalog-product-stock'))
  assert.ok(!catalog.includes('edit-product-stock'))
})

test('catalog admin keeps modal editor state separate from selected detail state', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('const [editorProductId, setEditorProductId] = useState(null)'))
  assert.ok(catalog.includes('const editorProduct = useMemo('))
  assert.ok(catalog.includes('if (!editorProduct) return'))
  assert.ok(catalog.includes('{editorProduct ? ('))
})

test('inventory uses concise operational copy', () => {
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(inventory.includes('Manage stock levels, thresholds, and item availability for catalog products.'))
})

test('staff accounts uses concise operational copy', () => {
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')

  assert.ok(staff.includes('Create accounts, manage access, and keep operations staffing usable.'))
})

test('analytics uses concise operational copy', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  assert.ok(analytics.includes("Review today's workload, bottlenecks, and live operational signals."))
})

test('inventory keeps product list before selected detail', () => {
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  const inventoryListIndex = inventory.indexOf('aria-label="Inventory stock table"')
  const inventoryDetailIndex = inventory.indexOf('title="Selected Product"')
  const adjustmentIndex = inventory.indexOf('title="Stock Adjustment"')
  const historyIndex = inventory.indexOf('title="Adjustment History"')

  assert.notEqual(inventoryListIndex, -1)
  assert.notEqual(inventoryDetailIndex, -1)
  assert.notEqual(adjustmentIndex, -1)
  assert.notEqual(historyIndex, -1)
  assert.ok(inventoryListIndex < inventoryDetailIndex)
  assert.ok(inventoryDetailIndex < adjustmentIndex)
  assert.ok(adjustmentIndex < historyIndex)
})

test('inventory workspace removes planned glossary language from the main surface', () => {
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(!inventory.includes('Planned Stock Controls'))
  assert.ok(!inventory.includes('Stock State Glossary'))
  assert.ok(!inventory.includes('Planned Capability'))
  assert.ok(!inventory.includes('Planned State'))
  assert.ok(!inventory.includes('Inventory Coverage'))
  assert.ok(!inventory.includes('coverage'))
  assert.ok(!inventory.includes('planned'))
  assert.ok(!inventory.includes('backlog'))
})

test('staff accounts keeps the managed directory ahead of provisioning controls', () => {
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')

  const staffDirectoryIndex = staff.indexOf('Managed Account Directory')
  const staffProvisioningIndex = staff.indexOf('Provision Operations Accounts')

  assert.notEqual(staffDirectoryIndex, -1)
  assert.notEqual(staffProvisioningIndex, -1)
  assert.ok(staffDirectoryIndex < staffProvisioningIndex)
})

test('analytics keeps current operations sections ahead of dashboard summaries', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  const analyticsOperationsIndex = analytics.indexOf('title="Booking Status Mix"')
  const analyticsDashboardIndex = analytics.indexOf('title="Sales Signals"')

  assert.notEqual(analyticsOperationsIndex, -1)
  assert.notEqual(analyticsDashboardIndex, -1)
  assert.ok(analyticsOperationsIndex < analyticsDashboardIndex)
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
