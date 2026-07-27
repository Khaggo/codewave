import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

test('critical staff booking, job-order, QA, and invoice screens use business-readable references', () => {
  const bookings = read('frontend/src/app/bookings/BookingsList.js')
  const jobOrders = read('frontend/src/screens/JobOrderWorkbench.js')
  const qaAudit = read('frontend/src/screens/QAAuditWorkspace.js')
  const qaAuditView = read('frontend/src/screens/qaAuditView.mjs')
  const invoices = read('frontend/src/screens/InvoiceOrderManagementWorkspace.js')

  assert.match(bookings, /if \(recordOrId\.bookingReference\) \{/)
  assert.match(bookings, /return compactDate \? `BK-\$\{compactDate\}-\$\{plateToken\}` : `BK-\$\{plateToken\}`/)
  assert.doesNotMatch(bookings, /BK-\$\{String\(recordOrId\)\.slice\(0,\s*8\)\.toUpperCase\(\)\}/)

  assert.match(jobOrders, /function formatBookingReference\(record\) \{/)
  assert.match(jobOrders, /function formatJobOrderReference\(record\) \{/)
  assert.match(jobOrders, /invoiceRecord\?\.invoiceReference/)
  assert.match(jobOrders, /activeSourceCandidate\?\.customerLabel\s*\?\?\s*activeJobOrder\.customerLabel/)
  assert.match(jobOrders, /activeSourceCandidate\?\.vehicleLabel\s*\?\?\s*activeJobOrder\.vehicleLabel/)
  assert.doesNotMatch(jobOrders, /activeSourceCandidate\?\.customerLabel\s*\?\?\s*activeJobOrder\.customerUserId/)
  assert.doesNotMatch(jobOrders, /activeSourceCandidate\?\.vehicleLabel\s*\?\?\s*activeJobOrder\.vehicleId/)

  assert.match(qaAudit, /function formatJobOrderReference\(jobOrder\) \{/)
  assert.match(qaAudit, /function getLoadedJobOrderReference\(jobOrderId, jobOrderOptions, qualityGate = null\) \{/)
  assert.match(qaAudit, /const selectedJobOrderReference = getLoadedJobOrderReference\(jobOrderId, jobOrderOptions, qualityGate\)/)
  assert.match(qaAudit, /const targetReference = selectedJobOrderReference/)
  assert.match(qaAudit, /targetReference} now has an auditable super-admin override\./)
  assert.match(qaAudit, /reference: completedJobOrderReference/)
  assert.match(qaAuditView, /jobOrderReference} was returned for technician remediation\./)
  assert.match(qaAuditView, /jobOrderReference} is now cleared for finalization\./)
  assert.doesNotMatch(qaAudit, /<p className="mt-2 break-all text-sm font-semibold text-ink-primary">\{qualityGate\.jobOrderId\}<\/p>/)

  assert.match(invoices, /const formatJobOrderReference = \(jobOrder\) => \{/)
  assert.match(invoices, /serviceInvoice\?\.invoiceReference/)
})

test('Objective 5 proof surfaces expose discrepancy and customer-summary evidence anchors', () => {
  const qaAudit = read('frontend/src/screens/QAAuditWorkspace.js')
  const customerSummaryScreen = read('mobile/src/screens/VehicleLifecycleScreen.js')
  const customerSummaryClient = read('mobile/src/lib/vehicleLifecycleClient.js')

  const requiredQaFragments = [
    'Risk Score',
    'Semantic Match',
    'Blocking Findings',
    'Review Needed',
    'Return to Job Order',
  ]

  for (const fragment of requiredQaFragments) {
    assert.ok(qaAudit.includes(fragment), `Expected Objective 5 QA fragment: ${fragment}`)
  }

  assert.match(customerSummaryScreen, /Customer-visible reviewed summary/)
  assert.match(customerSummaryScreen, /snapshot\.summaryCard\.summaryText/)
  assert.match(customerSummaryClient, /\/api\/vehicles\/\$\{vehicleId\}\/lifecycle-summary\/latest/)
})
