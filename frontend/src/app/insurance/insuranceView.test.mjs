import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInsuranceTableRow,
  getNextInsuranceWorkspaceViewState,
  formatStatusLabel,
  getInsuranceDetailTabs,
  getInsuranceSummaryCards,
} from './insuranceView.mjs'
import { updateInsuranceInquiryStatus } from '../../lib/insuranceStaffClient.js'

const buildInquiryFixture = (overrides = {}) => ({
  id: 'inq-1',
  status: 'payment_pending',
  documentStatus: 'complete',
  paymentStatus: 'proof_submitted',
  renewalStatus: 'upcoming',
  paymentDueAt: '2026-05-30T00:00:00.000Z',
  policyExpiryAt: '2026-08-15T00:00:00.000Z',
  renewalDueAt: '2026-07-15T00:00:00.000Z',
  assignedStaffId: 'adviser-1',
  reviewNotes: 'Waiting for proof review.',
  ...overrides,
})

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
      {
        label: 'Editable Fields',
        value: '9',
        sub: 'status, workflow tags, assignee, due dates, and review notes',
      },
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

test('getInsuranceSummaryCards ignores terminal inquiries for payment and renewal follow-ups', () => {
  assert.deepEqual(
    getInsuranceSummaryCards({
      inquiries: [
        { status: 'closed', paymentStatus: 'proof_submitted', renewalStatus: 'upcoming' },
        { status: 'cancelled', paymentStatus: 'overdue', renewalStatus: 'expired' },
        { status: 'rejected', paymentStatus: 'unpaid', renewalStatus: 'quoted' },
        { status: 'payment_pending', paymentStatus: 'proof_submitted', renewalStatus: 'not_applicable' },
        { status: 'for_renewal', paymentStatus: 'paid', renewalStatus: 'upcoming' },
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['New Inquiries', 0],
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

test('getInsuranceDetailTabs exposes overview, documents, timeline, payment, and renewal', () => {
  assert.deepEqual(
    getInsuranceDetailTabs().map((tab) => tab.key),
    ['overview', 'documents', 'timeline', 'payment', 'renewal', 'activity'],
  )
})

test('getNextInsuranceWorkspaceViewState preserves tab, feedback, and dirty draft when the same inquiry refreshes', () => {
  const draftInProgress = {
    status: 'payment_pending',
    documentStatus: 'complete',
    paymentStatus: 'proof_submitted',
    renewalStatus: 'upcoming',
    paymentDueAt: '2026-05-30',
    policyExpiryAt: '2026-08-15',
    renewalDueAt: '2026-07-15',
    assignedStaffId: 'adviser-1',
    reviewNotes: 'Call customer before approval.',
  }

  assert.deepEqual(
    getNextInsuranceWorkspaceViewState({
      currentActiveDetailTab: 'payment',
      currentDetailMessage: 'Live insurance detail refreshed from the backend.',
      currentDetailState: 'detail_loaded',
      currentUpdateDraft: draftInProgress,
      currentUpdateMessage: 'Insurance workflow updated to Payment Pending.',
      currentUpdateState: 'status_update_saved',
      detailTabs: getInsuranceDetailTabs(),
      nextInquiry: buildInquiryFixture(),
      nextStatuses: ['active', 'for_renewal', 'closed'],
      previousInquiryId: 'inq-1',
    }),
    {
      activeDetailTab: 'payment',
      detailMessage: 'Live insurance detail refreshed from the backend.',
      detailState: 'detail_loaded',
      updateDraft: draftInProgress,
      updateMessage: 'Insurance workflow updated to Payment Pending.',
      updateState: 'status_update_saved',
    },
  )
})

test('getNextInsuranceWorkspaceViewState resets tab and hydrates draft when the selected inquiry changes', () => {
  assert.deepEqual(
    getNextInsuranceWorkspaceViewState({
      currentActiveDetailTab: 'payment',
      currentDetailMessage: 'Old detail message',
      currentDetailState: 'detail_loaded',
      currentUpdateDraft: {
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
        paymentDueAt: '2026-05-30',
        policyExpiryAt: '2026-08-15',
        renewalDueAt: '2026-07-15',
        assignedStaffId: 'adviser-1',
        reviewNotes: 'Dirty draft',
      },
      currentUpdateMessage: 'Old update message',
      currentUpdateState: 'status_update_saved',
      detailTabs: getInsuranceDetailTabs(),
      nextInquiry: buildInquiryFixture({
        id: 'inq-2',
        status: 'under_review',
        documentStatus: 'under_verification',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        paymentDueAt: null,
        policyExpiryAt: null,
        renewalDueAt: null,
        assignedStaffId: null,
        reviewNotes: null,
      }),
      nextStatuses: ['for_approval', 'approved'],
      previousInquiryId: 'inq-1',
    }),
    {
      activeDetailTab: 'overview',
      detailMessage: '',
      detailState: 'detail_loaded',
      updateDraft: {
        status: 'for_approval',
        documentStatus: 'under_verification',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        paymentDueAt: '',
        policyExpiryAt: '',
        renewalDueAt: '',
        assignedStaffId: '',
        reviewNotes: '',
      },
      updateMessage: '',
      updateState: 'status_update_ready',
    },
  )
})

test('updateInsuranceInquiryStatus omits blank optional workflow fields from the payload', async () => {
  const originalFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    calls.push({
      url,
      options: {
        ...options,
        body: options.body,
      },
    })

    return new Response(
      JSON.stringify({
        id: 'inq-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'Bumper damage',
        description: 'Customer inquiry',
        status: 'under_review',
        documentStatus: 'complete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        createdByUserId: 'staff-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        documents: [],
        activities: [],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  try {
    await updateInsuranceInquiryStatus({
      inquiryId: 'inq-1',
      status: 'under_review',
      documentStatus: 'complete',
      paymentDueAt: '   ',
      policyExpiryAt: '',
      renewalDueAt: ' \n ',
      assignedStaffId: '   ',
      reviewNotes: ' Ready for review ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: 'under_review',
    documentStatus: 'complete',
    reviewNotes: 'Ready for review',
  })
})
