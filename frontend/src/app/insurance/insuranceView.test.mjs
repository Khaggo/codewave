import test from 'node:test'
import assert from 'node:assert/strict'

import { formatStatusLabel, getInsuranceSummaryCards } from './insuranceView.mjs'

test('formatStatusLabel title-cases unknown insurance statuses', () => {
  assert.equal(formatStatusLabel('approved_for_record'), 'Approved For Record')
})

test('getInsuranceSummaryCards returns queue and active inquiry summary values', () => {
  assert.deepEqual(
    getInsuranceSummaryCards({
      queueItems: [{ id: 'inq-1' }, { id: 'inq-2' }],
      queueState: 'queue_loaded',
      activeInquiry: { status: 'under_review', subject: 'Bumper damage' },
    }),
    [
      { label: 'Review Queue', value: 2, sub: 'Queue items loaded' },
      { label: 'Allowed Roles', value: '2', sub: 'service adviser, super admin' },
      { label: 'Selected Inquiry', value: 'Under Review', sub: 'Bumper damage' },
      { label: 'Editable Fields', value: '2', sub: 'status and review notes only' },
    ],
  )
})
