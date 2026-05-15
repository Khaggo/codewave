import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInsuranceBroadcastRequest,
  buildInsuranceTableRow,
  buildInsuranceReminderRequest,
  getNextInsuranceWorkspaceViewState,
  shouldApplyInsuranceAsyncResult,
  summarizeInsuranceBroadcastResult,
  summarizeInsuranceReminderResult,
  formatStatusLabel,
  getInsuranceDetailTabs,
  getInsuranceSummaryCards,
} from './insuranceView.mjs'
import * as insuranceStaffClient from '../../lib/insuranceStaffClient.js'

const {
  createInsuranceRenewalFollowUp,
  sendInsuranceBroadcasts,
  sendInsuranceReminders,
  updateInsuranceInquiryStatus,
  updateInsuranceInquiryWorkflow,
} = insuranceStaffClient

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
        value: '2',
        sub: 'status and review notes only',
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
        reviewNotes: '',
      },
      updateMessage: '',
      updateState: 'status_update_ready',
    },
  )
})

test('shouldApplyInsuranceAsyncResult only applies async UI state when the same inquiry is still selected', () => {
  assert.equal(
    shouldApplyInsuranceAsyncResult({
      requestInquiryId: 'inq-1',
      selectedInquiryId: 'inq-1',
    }),
    true,
  )

  assert.equal(
    shouldApplyInsuranceAsyncResult({
      requestInquiryId: 'inq-1',
      selectedInquiryId: 'inq-2',
    }),
    false,
  )

  assert.equal(
    shouldApplyInsuranceAsyncResult({
      requestInquiryId: 'inq-1',
      selectedInquiryId: '',
    }),
    false,
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
      reviewNotes: ' Ready for review ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: 'under_review',
    reviewNotes: 'Ready for review',
  })
})

test('updateInsuranceInquiryWorkflow posts trimmed workflow metadata to the workflow route', async () => {
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
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
        assignedStaffId: 'adviser-2',
        paymentDueAt: '2026-05-30T00:00:00.000Z',
        policyExpiryAt: '2026-08-15T00:00:00.000Z',
        renewalDueAt: '2026-07-15T00:00:00.000Z',
        reviewNotes: 'Waiting for accounting confirmation.',
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

  let result

  try {
    result = await updateInsuranceInquiryWorkflow({
      inquiryId: 'inq-1',
      status: 'payment_pending',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      paymentDueAt: ' 2026-05-30T00:00:00.000Z ',
      policyExpiryAt: '',
      renewalDueAt: '\n2026-07-15T00:00:00.000Z  ',
      assignedStaffId: ' adviser-2 ',
      reviewNotes: ' Waiting for accounting confirmation. ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:3000/api/insurance/inquiries/inq-1/workflow')
  assert.equal(result?.status, 'payment_pending')
  assert.equal(result?.assignedStaffId, 'adviser-2')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: 'payment_pending',
    documentStatus: 'complete',
    paymentStatus: 'proof_submitted',
    renewalStatus: 'upcoming',
    paymentDueAt: '2026-05-30T00:00:00.000Z',
    renewalDueAt: '2026-07-15T00:00:00.000Z',
    assignedStaffId: 'adviser-2',
    reviewNotes: 'Waiting for accounting confirmation.',
  })
})

test('createInsuranceRenewalFollowUp posts a live renewal follow-up payload and returns a normalized inquiry', async () => {
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
        id: 'inq-renewal-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        purpose: 'renewal',
        subject: 'Renewal due next month',
        description: 'Customer should receive a renewal quote before the current policy expires.',
        status: 'for_renewal',
        documentStatus: 'complete',
        paymentStatus: 'not_required',
        renewalStatus: 'upcoming',
        providerName: 'Provider A',
        policyNumber: 'POL-2026-00045',
        notes: 'Customer prefers a morning follow-up call.',
        assignedStaffId: '550e8400-e29b-41d4-a716-446655440000',
        policyExpiryAt: '2026-06-20T00:00:00.000Z',
        renewalDueAt: '2026-06-15T00:00:00.000Z',
        createdByUserId: 'staff-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        documents: [],
        activities: [],
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  let result

  try {
    result = await createInsuranceRenewalFollowUp({
      userId: ' user-1 ',
      vehicleId: 'vehicle-1',
      inquiryType: 'comprehensive',
      subject: ' Renewal due next month ',
      description: ' Customer should receive a renewal quote before the current policy expires. ',
      renewalDueAt: ' 2026-06-15T00:00:00.000Z ',
      policyExpiryAt: '2026-06-20T00:00:00.000Z',
      providerName: ' Provider A ',
      policyNumber: '   ',
      assignedStaffId: ' ',
      notes: ' Customer prefers a morning follow-up call. ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:3000/api/insurance/renewals/follow-ups')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    userId: 'user-1',
    vehicleId: 'vehicle-1',
    inquiryType: 'comprehensive',
    subject: 'Renewal due next month',
    description: 'Customer should receive a renewal quote before the current policy expires.',
    renewalDueAt: '2026-06-15T00:00:00.000Z',
    policyExpiryAt: '2026-06-20T00:00:00.000Z',
    providerName: 'Provider A',
    notes: 'Customer prefers a morning follow-up call.',
  })
  assert.equal(result?.id, 'inq-renewal-1')
  assert.equal(result?.purpose, 'renewal')
  assert.equal(result?.renewalStatus, 'upcoming')
  assert.equal(result?.subject, 'Renewal due next month')
})

test('buildInsuranceReminderRequest deduplicates selected ids for selected-cases sends', () => {
  assert.deepEqual(
    buildInsuranceReminderRequest({
      reminderType: 'missing_documents',
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', 'inq-1', 'inq-2'],
      filters: {
        status: 'all',
        paymentStatus: 'all',
        renewalStatus: 'all',
        search: '',
      },
    }),
    {
      reminderType: 'missing_documents',
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', 'inq-2'],
    },
  )
})

test('buildInsuranceReminderRequest keeps only meaningful server filters for filtered-results sends', () => {
  assert.deepEqual(
    buildInsuranceReminderRequest({
      reminderType: 'renewal_follow_up',
      targetMode: 'filtered_results',
      selectedIds: [],
      filters: {
        status: 'for_renewal',
        paymentStatus: 'all',
        renewalStatus: 'upcoming',
        search: 'customer side search is local only',
      },
    }),
    {
      reminderType: 'renewal_follow_up',
      targetMode: 'filtered_results',
      filters: {
        status: 'for_renewal',
        renewalStatus: 'upcoming',
      },
    },
  )
})

test('buildInsuranceBroadcastRequest trims content and deduplicates selected ids for selected-cases sends', () => {
  assert.deepEqual(
    buildInsuranceBroadcastRequest({
      targetMode: ' selected_cases ',
      selectedIds: ['inq-1', 'inq-1', ' inq-2 '],
      filters: {
        status: 'all',
      },
      title: ' Insurance processing update ',
      message: ' Please review your insurance request in the app for the latest update. ',
    }),
    {
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', 'inq-2'],
      title: 'Insurance processing update',
      message: 'Please review your insurance request in the app for the latest update.',
    },
  )
})

test('buildInsuranceBroadcastRequest keeps only meaningful server filters for filtered-results sends', () => {
  assert.deepEqual(
    buildInsuranceBroadcastRequest({
      targetMode: 'filtered_results',
      selectedIds: ['inq-1'],
      filters: {
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'all',
        search: 'local only',
      },
      title: 'Payment follow-up',
      message: 'Please upload any remaining payment support if requested.',
    }),
    {
      targetMode: 'filtered_results',
      filters: {
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
      },
      title: 'Payment follow-up',
      message: 'Please upload any remaining payment support if requested.',
    },
  )
})

test('buildInsuranceBroadcastRequest rejects empty broadcast content or missing targets', () => {
  assert.throws(
    () =>
      buildInsuranceBroadcastRequest({
        targetMode: 'selected_cases',
        selectedIds: ['inq-1'],
        title: '   ',
        message: 'Valid message',
      }),
    /title, message, and target mode are required/i,
  )

  assert.throws(
    () =>
      buildInsuranceBroadcastRequest({
        targetMode: 'selected_cases',
        selectedIds: [],
        title: 'Insurance processing update',
        message: 'Valid message',
      }),
    /select at least one insurance case/i,
  )

  assert.throws(
    () =>
      buildInsuranceBroadcastRequest({
        targetMode: 'filtered_results',
        filters: {
          status: 'all',
          search: 'local only',
        },
        title: 'Insurance processing update',
        message: 'Valid message',
      }),
    /choose at least one server-side insurance filter/i,
  )

  assert.throws(
    () =>
      buildInsuranceBroadcastRequest({
        targetMode: 'single_case',
        selectedIds: ['inq-1'],
        title: 'Insurance processing update',
        message: 'Valid message',
      }),
    /selected_cases or filtered_results/i,
  )
})

test('summarizeInsuranceReminderResult reports sent, skipped, and failed reminder counts', () => {
  assert.equal(
    summarizeInsuranceReminderResult({
      sentCount: 3,
      skippedCount: 1,
      failedCount: 2,
    }),
    'Sent 3 reminder(s). 1 skipped. 2 failed.',
  )
})

test('summarizeInsuranceBroadcastResult reports customer-level sends and inquiry-level follow-up counts', () => {
  assert.equal(
    summarizeInsuranceBroadcastResult({
      sentCount: 1,
      skippedCount: 2,
      failedCount: 1,
      deduplicatedCustomerCount: 3,
    }),
    'Sent 1 of 3 customer broadcast(s). 2 inquiry result(s) skipped. 1 failed.',
  )
})

test('sendInsuranceReminders posts the built manual reminder payload to the reminder route', async () => {
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
        targetedCount: 2,
        eligibleCount: 2,
        sentCount: 2,
        skippedCount: 0,
        failedCount: 0,
        results: [
          { inquiryId: 'inq-1', reminderType: 'payment_pending', result: 'sent' },
          { inquiryId: 'inq-2', reminderType: 'payment_pending', result: 'sent' },
        ],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  let result

  try {
    result = await sendInsuranceReminders({
      reminderType: 'payment_pending',
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', 'inq-2'],
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:3000/api/insurance/reminders/send')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    reminderType: 'payment_pending',
    targetMode: 'selected_cases',
    selectedIds: ['inq-1', 'inq-2'],
  })
  assert.equal(result?.sentCount, 2)
  assert.equal(result?.results?.length, 2)
})

test('sendInsuranceReminders deduplicates selected ids before posting to the reminder route', async () => {
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
        targetedCount: 2,
        eligibleCount: 2,
        sentCount: 2,
        skippedCount: 0,
        failedCount: 0,
        results: [
          { inquiryId: 'inq-1', reminderType: 'payment_pending', result: 'sent' },
          { inquiryId: 'inq-2', reminderType: 'payment_pending', result: 'sent' },
        ],
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
    await sendInsuranceReminders({
      reminderType: 'payment_pending',
      targetMode: 'selected_cases',
      selectedIds: ['inq-1', ' inq-1 ', 'inq-2'],
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    reminderType: 'payment_pending',
    targetMode: 'selected_cases',
    selectedIds: ['inq-1', 'inq-2'],
  })
})

test('sendInsuranceReminders strips meaningless filters before posting filtered-results payloads', async () => {
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
        targetedCount: 2,
        eligibleCount: 2,
        sentCount: 2,
        skippedCount: 0,
        failedCount: 0,
        results: [
          { inquiryId: 'inq-1', reminderType: 'renewal_follow_up', result: 'sent' },
          { inquiryId: 'inq-2', reminderType: 'renewal_follow_up', result: 'sent' },
        ],
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
    await sendInsuranceReminders({
      reminderType: 'renewal_follow_up',
      targetMode: 'filtered_results',
      filters: {
        purpose: 'renewal',
        status: 'all',
        paymentStatus: '',
        renewalStatus: ' upcoming ',
        search: 'local only',
      },
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    reminderType: 'renewal_follow_up',
    targetMode: 'filtered_results',
    filters: {
      purpose: 'renewal',
      renewalStatus: 'upcoming',
    },
  })
})

test('sendInsuranceReminders rejects filtered-results sends with no meaningful server-side filters', async () => {
  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: 'renewal_follow_up',
        targetMode: 'filtered_results',
        filters: {
          status: 'all',
          paymentStatus: ' ',
          search: 'local only',
        },
        accessToken: 'token-1',
      }),
    /choose at least one server-side insurance filter/i,
  )
})

test('sendInsuranceReminders rejects missing reminder type or target mode at the client boundary', async () => {
  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: '   ',
        targetMode: 'selected_cases',
        selectedIds: ['inq-1'],
        accessToken: 'token-1',
      }),
    /reminder type and target mode are required/i,
  )

  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: 'missing_documents',
        targetMode: '   ',
        selectedIds: ['inq-1'],
        accessToken: 'token-1',
      }),
    /reminder type and target mode are required/i,
  )
})

test('sendInsuranceReminders rejects selected reminder modes without selected ids', async () => {
  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: 'missing_documents',
        targetMode: 'selected_cases',
        selectedIds: [' ', ''],
        accessToken: 'token-1',
      }),
    /select at least one insurance case/i,
  )

  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: 'missing_documents',
        targetMode: 'single_case',
        selectedIds: [],
        accessToken: 'token-1',
      }),
    /select at least one insurance case/i,
  )
})

test('sendInsuranceReminders rejects single-case reminder sends with more than one selected id after dedupe', async () => {
  await assert.rejects(
    () =>
      sendInsuranceReminders({
        reminderType: 'missing_documents',
        targetMode: 'single_case',
        selectedIds: ['inq-1', 'inq-2'],
        accessToken: 'token-1',
      }),
    /single-case reminders require exactly one selected insurance case/i,
  )
})

test('sendInsuranceBroadcasts posts the built broadcast payload to the broadcast route', async () => {
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
        targetedCaseCount: 2,
        eligibleCaseCount: 2,
        deduplicatedCustomerCount: 1,
        sentCount: 1,
        skippedCount: 0,
        failedCount: 0,
        results: [
          { inquiryId: 'inq-1', customerId: 'customer-1', status: 'sent', reason: null },
          { inquiryId: 'inq-2', customerId: 'customer-1', status: 'sent', reason: null },
        ],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  let result

  try {
    result = await sendInsuranceBroadcasts({
      targetMode: 'filtered_results',
      selectedIds: ['inq-ignored'],
      filters: {
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
        search: 'local only',
      },
      title: ' Payment follow-up ',
      message: ' Please upload any remaining payment support if requested. ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:3000/api/insurance/broadcasts/send')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    targetMode: 'filtered_results',
    filters: {
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
    },
    title: 'Payment follow-up',
    message: 'Please upload any remaining payment support if requested.',
  })
  assert.equal(result?.sentCount, 1)
  assert.equal(result?.deduplicatedCustomerCount, 1)
})
