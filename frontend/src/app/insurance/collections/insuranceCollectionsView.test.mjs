import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCollectionsFocusHighlights,
  buildCollectionsUpdateDraft,
  buildCollectionsTableRow,
  filterCollectionsItems,
  getCollectionsActionState,
  getCollectionsFilterSummary,
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

test('getCollectionsSummaryCards excludes terminal inquiries from active collections buckets', () => {
  assert.deepEqual(
    getCollectionsSummaryCards({
      now: '2026-05-14T12:00:00.000Z',
      inquiries: [
        buildInquiryFixture({ id: 'closed-unpaid', status: 'closed', paymentStatus: 'unpaid' }),
        buildInquiryFixture({ id: 'cancelled-proof', status: 'cancelled', paymentStatus: 'proof_submitted' }),
        buildInquiryFixture({ id: 'rejected-verifying', status: 'rejected', paymentStatus: 'verifying' }),
        buildInquiryFixture({ id: 'closed-overdue', status: 'closed', paymentStatus: 'overdue' }),
        buildInquiryFixture({ id: 'active-unpaid', status: 'payment_pending', paymentStatus: 'unpaid' }),
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['Unpaid', 1],
      ['Proof Submitted', 0],
      ['Verifying', 0],
      ['Overdue', 0],
      ['Paid This Week', 0],
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

test('getCollectionsActionState enables payment reminders for overdue unpaid cases', () => {
  assert.deepEqual(
    getCollectionsActionState(buildInquiryFixture(), {
      now: '2026-05-14T12:00:00.000Z',
    }),
    {
      canSendPaymentReminder: true,
      canReviewProofOfPayment: false,
      canMarkAsPaid: false,
    },
  )
})

test('getCollectionsActionState enables proof review and mark-paid actions only when proof exists', () => {
  assert.deepEqual(
    getCollectionsActionState(
      buildInquiryFixture({
        paymentStatus: 'verifying',
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
      canSendPaymentReminder: false,
      canReviewProofOfPayment: true,
      canMarkAsPaid: true,
    },
  )
})

test('getCollectionsActionState disables all actions for terminal inquiries', () => {
  assert.deepEqual(
    getCollectionsActionState(
      buildInquiryFixture({
        status: 'closed',
        paymentStatus: 'verifying',
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
      canSendPaymentReminder: false,
      canReviewProofOfPayment: false,
      canMarkAsPaid: false,
    },
  )
})

test('buildCollectionsUpdateDraft keeps payment metadata editable for the collections workflow route', () => {
  assert.deepEqual(
    buildCollectionsUpdateDraft({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01T00:00:00.000Z',
      reviewNotes: 'Uploaded receipt',
    }),
    {
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-06-01',
      reviewNotes: 'Uploaded receipt',
    },
  )
})

test('buildCollectionsUpdateDraft does not copy customer intake notes into review notes', () => {
  assert.deepEqual(
    buildCollectionsUpdateDraft({
      status: 'payment_pending',
      paymentStatus: 'unpaid',
      paymentDueAt: '2026-06-01T00:00:00.000Z',
      notes: 'Customer asked for a callback after lunch.',
      reviewNotes: null,
    }),
    {
      status: 'payment_pending',
      paymentStatus: 'unpaid',
      paymentDueAt: '2026-06-01',
      reviewNotes: '',
    },
  )
})

test('filterCollectionsItems re-applies the local payment-status filter after live item updates', () => {
  const now = '2026-05-14T12:00:00.000Z'
  const items = [
    buildInquiryFixture({ id: 'inq-paid', paymentStatus: 'paid' }),
    buildInquiryFixture({ id: 'inq-unpaid', paymentStatus: 'unpaid' }),
  ].map((inquiry) => ({
    inquiry,
    row: buildCollectionsTableRow(inquiry, { now }),
    actionState: getCollectionsActionState(inquiry, { now }),
  }))

  assert.deepEqual(
    filterCollectionsItems(items, {
      filters: {
        paymentStatus: 'unpaid',
        overdueOnly: false,
        hasProof: 'all',
        search: '',
      },
    }).map(({ inquiry }) => inquiry.id),
    ['inq-unpaid'],
  )
})

test('getCollectionsFilterSummary explains the active queue scope and overdue/proof narrowing', () => {
  assert.deepEqual(
    getCollectionsFilterSummary({
      filters: {
        paymentStatus: 'verifying',
        overdueOnly: true,
        hasProof: 'with_proof',
        search: 'casey',
      },
      visibleCount: 2,
      totalCount: 9,
    }),
    {
      tone: 'urgent',
      title: '2 collections cases in view',
      detail: 'Verifying, overdue only, with proof, matching "casey". 7 hidden.',
    },
  )
})

test('buildCollectionsFocusHighlights keeps the queue guidance compact', () => {
  assert.deepEqual(
    buildCollectionsFocusHighlights({
      filters: {
        overdueOnly: true,
      },
      selectedInquiry: buildInquiryFixture({
        id: 'inq-proof',
        customerDisplayName: 'Casey Customer',
        paymentStatus: 'proof_submitted',
      }),
      hasProofInView: true,
      visibleCount: 3,
    }),
    [
      {
        label: 'Queue',
        value: '3 visible',
        hint: 'Overdue only',
        tone: 'warning',
      },
      {
        label: 'Selected',
        value: 'Casey Customer',
        hint: 'Proof submitted',
        tone: 'positive',
      },
    ],
  )
})
