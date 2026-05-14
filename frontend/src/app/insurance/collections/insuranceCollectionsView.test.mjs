import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCollectionsTableRow,
  getCollectionsSummaryCards,
} from './insuranceCollectionsView.mjs'

const buildInquiryFixture = (overrides = {}) => ({
  id: 'collection-1',
  customerDisplayName: 'Casey Customer',
  vehicleLabel: 'Toyota Vios (INS110A)',
  status: 'payment_pending',
  paymentStatus: 'unpaid',
  paymentDueAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-14T09:00:00.000Z',
  documents: [],
  ...overrides,
})

test('getCollectionsSummaryCards counts unpaid, proof-submitted, verifying, overdue, and paid-this-week cases', () => {
  assert.deepEqual(
    getCollectionsSummaryCards({
      now: '2026-05-14T12:00:00.000Z',
      inquiries: [
        buildInquiryFixture({ id: 'inq-unpaid', paymentStatus: 'unpaid' }),
        buildInquiryFixture({ id: 'inq-proof', paymentStatus: 'proof_submitted' }),
        buildInquiryFixture({ id: 'inq-verifying', paymentStatus: 'verifying' }),
        buildInquiryFixture({ id: 'inq-overdue', paymentStatus: 'overdue' }),
        buildInquiryFixture({
          id: 'inq-paid-week',
          paymentStatus: 'paid',
          paidAt: '2026-05-13T09:00:00.000Z',
        }),
        buildInquiryFixture({
          id: 'inq-paid-old',
          paymentStatus: 'paid',
          paidAt: '2026-05-01T09:00:00.000Z',
        }),
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['Unpaid', 1],
      ['Proof Submitted', 1],
      ['Verifying', 1],
      ['Overdue', 1],
      ['Paid This Week', 1],
    ],
  )
})

test('buildCollectionsTableRow calculates overdue days and hides proof of payment when no proof exists', () => {
  assert.deepEqual(
    buildCollectionsTableRow(buildInquiryFixture(), {
      now: '2026-05-14T12:00:00.000Z',
    }),
    {
      key: 'collection-1',
      customer: 'Casey Customer',
      vehicle: 'Toyota Vios (INS110A)',
      status: 'Payment Pending',
      paymentStatus: 'Unpaid',
      paymentDueAt: '2026-05-10T00:00:00.000Z',
      daysOverdue: 4,
      hasProofOfPayment: false,
    },
  )
})

test('buildCollectionsTableRow shows proof of payment when a proof document is attached and does not mark future dues overdue', () => {
  assert.deepEqual(
    buildCollectionsTableRow(
      buildInquiryFixture({
        id: 'collection-2',
        paymentStatus: 'proof_submitted',
        paymentDueAt: '2026-05-18T00:00:00.000Z',
        documents: [
          {
            id: 'doc-1',
            documentType: 'proof_of_payment',
          },
        ],
      }),
      {
        now: '2026-05-14T12:00:00.000Z',
      },
    ),
    {
      key: 'collection-2',
      customer: 'Casey Customer',
      vehicle: 'Toyota Vios (INS110A)',
      status: 'Payment Pending',
      paymentStatus: 'Proof Submitted',
      paymentDueAt: '2026-05-18T00:00:00.000Z',
      daysOverdue: 0,
      hasProofOfPayment: true,
    },
  )
})
