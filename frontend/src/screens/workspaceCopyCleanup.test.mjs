import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('dashboard workspace copy is concise', () => {
  const source = read('frontend/src/screens/Dashboard.js')

  assert.ok(source.includes('Review assigned work and keep repair progress current.'))
  assert.ok(source.includes('Manage booking, intake, job-order, QA, and finance work from one workspace.'))
  assert.ok(source.includes('Workshop Work'))
  assert.ok(source.includes('Open workspace'))
  assert.ok(source.includes('Live work currently in your workshop queue.'))

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

  assert.ok(finance.includes('Review finalized service invoices, payment entries, and completion records.'))
  assert.ok(finance.includes('Find a service invoice'))
  assert.ok(finance.includes('Keep one live summary in view while you work through invoice detail and payment history.'))
})

test('service flow workspaces use queue-first copy and remove bulky dashboard wording', () => {
  const jobOrderBoard = read('frontend/src/screens/JobOrdersOperationsBoard.jsx')
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrderBoard.includes('Claim work, monitor the workshop queue, and open one focused job workspace.'))
  assert.ok(jobOrders.includes('Track each service, blocker, update, and required evidence item.'))

  assert.ok(qa.includes('Review release checks, record verdicts, and keep overrides auditable.'))
  assert.ok(qa.includes('Complete your current review, then take next; teammates can review other records in parallel.'))

  assert.ok(finance.includes('Review finalized service invoices, payment entries, and completion records.'))
  assert.ok(finance.includes('Find a service invoice'))

  assert.ok(!jobOrders.includes('Choose a schedule date and refresh to load confirmed bookings.'))
  assert.ok(
    !qa.includes(
      'Review the validator summary before the head technician decides.',
    ),
  )
})

test('service workspaces use concise queue-first section labels', () => {
  const jobOrderBoard = read('frontend/src/screens/JobOrdersOperationsBoard.jsx')
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qa = read('frontend/src/screens/QAAuditWorkspace.js')
  const finance = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.ok(jobOrderBoard.includes('Workshop queue'))
  assert.ok(jobOrders.includes('Service Progress'))
  assert.ok(jobOrders.includes('QA handoff'))

  assert.ok(qa.includes('QA Queue'))
  assert.ok(qa.includes('Selected Audit'))

  assert.ok(finance.includes('Service Invoices'))
  assert.ok(finance.includes('Invoice Detail'))
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

test('job orders separate the team queue from the focused service workspace', () => {
  const board = read('frontend/src/screens/JobOrdersOperationsBoard.jsx')
  const workspace = read('frontend/src/screens/JobOrderWorkbench.js')

  assert.ok(board.includes('Workshop queue'))
  assert.ok(board.includes('Open workspace'))
  assert.ok(workspace.includes('Service Progress'))
  assert.ok(workspace.includes('>Services</p>'))
  assert.ok(workspace.includes('QA handoff'))
})

test('invoice workspace keeps record queue before payment details', () => {
  const source = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  const queueIndex = source.indexOf('Service Invoices')
  const detailIndex = source.indexOf('Invoice Detail')
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
    '<p className="card-title">Selected Inspection Detail</p>',
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

  assert.ok(inventory.includes('Create inventory-backed products, adjust stock, and maintain low-stock thresholds from one live workspace.'))
  assert.ok(inventory.includes('Create items, reconcile stock counts, and maintain live reorder thresholds without leaving this workspace.'))
  assert.ok(inventory.includes('Pick a live product from the directory below, then update its threshold or adjust quantity.'))
  assert.ok(inventory.includes('Live inventory directory'))
  assert.ok(inventory.includes('Search the linked product set and review visibility, quantity, and threshold state at a glance.'))
})

test('catalog admin uses concise operational copy', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('Manage live ecommerce categories and product listings from the actual ecommerce runtime.'))
})

test('catalog admin keeps live products ahead of publishing and editor controls', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  const catalogListIndex = catalog.indexOf('title="Catalog Products"')
  const catalogEditorIndex = catalog.indexOf('title="Publishing Controls"')
  const productModalIndex = catalog.indexOf('{editorProductId ? (')

  assert.notEqual(catalogListIndex, -1)
  assert.notEqual(catalogEditorIndex, -1)
  assert.notEqual(productModalIndex, -1)
  assert.ok(catalogListIndex < catalogEditorIndex)
  assert.ok(catalogEditorIndex < productModalIndex)
})

test('catalog admin uses marketplace publishing header copy', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('eyebrow="Marketplace publishing"'))
  assert.ok(catalog.includes('title="Catalog Admin"'))
  assert.ok(catalog.includes('Manage live ecommerce categories and product listings from the actual ecommerce runtime.'))
  assert.ok(catalog.includes('Search live products'))
  assert.ok(catalog.includes('open a listing for editing.'))
})

test('catalog admin keeps stock ownership in inventory', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(catalog.includes('createStaffInventoryProduct'))
  assert.ok(!catalog.includes('createStaffInventoryAdjustment'))
  assert.ok(!catalog.includes('updateStaffInventoryPolicy'))
  assert.ok(inventory.includes('Stock adjustment'))
  assert.ok(inventory.includes('Save stock policy'))
})

test('catalog admin keeps modal editor state separate from selected detail state', () => {
  const catalog = read('frontend/src/screens/ShopProductAdmin.js')

  assert.ok(catalog.includes('const [editorProductId, setEditorProductId] = useState(null)'))
  assert.ok(catalog.includes('const editorProduct = useMemo('))
  assert.ok(catalog.includes('if (!editorProduct) return'))
  assert.ok(catalog.includes('{editorProductId ? ('))
})

test('inventory uses concise operational copy', () => {
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  assert.ok(inventory.includes('Create inventory-backed products, adjust stock, and maintain low-stock thresholds from one live workspace.'))
})

test('staff accounts uses concise operational copy', () => {
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')

  assert.ok(staff.includes('Create service-adviser and admin identities from one protected workspace.'))
  assert.ok(staff.includes('activate or deactivate access without deleting its history.'))
})

test('analytics uses concise operational copy', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  assert.ok(analytics.includes('Inspect read-only analytics snapshots across operations and support domains.'))
})

test('inventory keeps live controls ahead of the searchable stock directory', () => {
  const inventory = read('frontend/src/screens/InventoryWorkspace.js')

  const controlIndex = inventory.indexOf('title="Inventory Control Center"')
  const directoryIndex = inventory.indexOf('title="Live inventory directory"')
  const inventoryListIndex = inventory.indexOf('aria-label="Inventory product table"')

  assert.notEqual(controlIndex, -1)
  assert.notEqual(directoryIndex, -1)
  assert.notEqual(inventoryListIndex, -1)
  assert.ok(controlIndex < directoryIndex)
  assert.ok(directoryIndex < inventoryListIndex)
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

test('staff accounts presents provisioning, status control, then the managed directory', () => {
  const staff = read('frontend/src/components/StaffProvisioningPanel.js')

  const staffProvisioningIndex = staff.indexOf('Provision Operations Accounts')
  const staffStatusIndex = staff.indexOf('Account Status Control')
  const staffDirectoryIndex = staff.indexOf('Managed Account Directory')

  assert.notEqual(staffProvisioningIndex, -1)
  assert.notEqual(staffStatusIndex, -1)
  assert.notEqual(staffDirectoryIndex, -1)
  assert.ok(staffProvisioningIndex < staffStatusIndex)
  assert.ok(staffStatusIndex < staffDirectoryIndex)
})

test('analytics keeps derived summaries ahead of the detailed operations mix', () => {
  const analytics = read('frontend/src/screens/AdminAnalyticsWorkspace.js')

  const analyticsOperationsIndex = analytics.indexOf('title="Booking Status Mix"')
  const analyticsDashboardIndex = analytics.indexOf('title="Sales Signals"')

  assert.notEqual(analyticsOperationsIndex, -1)
  assert.notEqual(analyticsDashboardIndex, -1)
  assert.ok(analyticsDashboardIndex < analyticsOperationsIndex)
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
