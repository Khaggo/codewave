import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInsuranceTableRow,
  formatStatusLabel,
  getInsuranceSummaryCards,
} from './insuranceView.mjs'

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

test('getInsuranceSummaryCards counts payment and renewal follow-ups', () => {
  assert.deepEqual(
    getInsuranceSummaryCards({
      inquiries: [
        { status: 'submitted', paymentStatus: 'not_required', renewalStatus: 'not_applicable' },
        { status: 'payment_pending', paymentStatus: 'proof_submitted', renewalStatus: 'upcoming' },
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['New Inquiries', 1],
      ['Payment Pending', 1],
      ['For Renewal', 1],
      ['Needs Documents', 0],
    ],
  )
})

test('buildInsuranceTableRow returns customer, vehicle, and workflow badges', () => {
  assert.deepEqual(
    buildInsuranceTableRow({
      id: 'inq-1',
      customerDisplayName: 'Casey Customer',
      vehicleLabel: 'Toyota Vios (INS110A)',
      status: 'payment_pending',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
    }),
    {
      key: 'inq-1',
      customer: 'Casey Customer',
      vehicle: 'Toyota Vios (INS110A)',
      status: 'Payment Pending',
      documentStatus: 'Complete',
      paymentStatus: 'Proof Submitted',
    },
  )
})
