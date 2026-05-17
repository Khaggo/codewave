import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getInvoicePdfStateLabel,
  getLoadMessageTone,
  shortId,
} from './invoiceOrderManagementView.mjs'

test('getInvoicePdfStateLabel returns the correct delivery label', () => {
  assert.equal(getInvoicePdfStateLabel(null), 'Awaiting invoice')
  assert.equal(getInvoicePdfStateLabel({ pdfEmailError: 'retry' }), 'Email retry needed')
  assert.equal(getInvoicePdfStateLabel({ pdfEmailSentAt: '2026-01-01T10:00:00Z' }), 'PDF emailed')
  assert.equal(getInvoicePdfStateLabel({ pdfGeneratedAt: '2026-01-01T10:00:00Z' }), 'PDF generated')
  assert.equal(getInvoicePdfStateLabel({}), 'Generation pending')
})

test('getLoadMessageTone maps invoice states to a shared tone', () => {
  assert.equal(getLoadMessageTone('invoice_order_loaded'), 'success')
  assert.equal(getLoadMessageTone('invoice_order_failed'), 'danger')
  assert.equal(getLoadMessageTone('invoice_order_runtime_unavailable'), 'danger')
  assert.equal(getLoadMessageTone('invoice_order_partial'), 'warning')
})

test('getLoadMessageTone keeps finance workspace tones stable', () => {
  assert.equal(getLoadMessageTone('invoice_order_empty'), 'warning')
  assert.equal(getLoadMessageTone('invoice_order_loaded'), 'success')
  assert.equal(getLoadMessageTone('invoice_order_forbidden_role'), 'danger')
})

test('shortId returns a stable uppercase preview', () => {
  assert.equal(shortId('abc123def456'), 'ABC123DE')
  assert.equal(shortId(''), 'NONE')
})
