import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCustomerInsuranceActionCards,
  buildCustomerInsuranceEntryState,
  buildCustomerInsuranceHomeFocus,
  buildCustomerInsuranceHeroState,
  buildCustomerInsuranceOverviewState,
  buildCustomerInsuranceStatusState,
  buildRequirementsChecklist,
  clearRememberedInquiryForVehicle,
  createPickedInsuranceDocumentDraft,
  doesCustomerInsuranceInquiryMatchVehicle,
  getCustomerInsurancePaymentSummary,
  getVehicleScopedCustomerInquiryId,
  getRememberedInquiryForVehicle,
  getCustomerInsuranceTimeline,
  getInsuranceHomeCards,
  hydrateRememberedInquiryMappings,
  rememberInquiryForVehicle,
  serializeRememberedInquiryMappings,
  shouldDeferCustomerInsuranceTrackingRefresh,
  shouldShowCustomerInsuranceFollowUp,
} from './insuranceModuleView.mjs'
import {
  addInsuranceInquiryDocument,
  normalizeCustomerInsuranceInquiry,
  uploadInsuranceInquiryDocumentFile,
} from '../lib/insuranceClient.js'

test('home cards prioritize start, upload, payment, and renewal actions', () => {
  assert.deepEqual(
    getInsuranceHomeCards({ hasActiveRequest: true }).map((card) => card.key),
    ['start', 'active', 'documents', 'payment', 'renewal', 'history'],
  )
})

test('insurance hero falls back to start state when there is no active request', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios · DEMOREV001',
      latestInquiry: null,
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Insurance',
      title: 'Start a new request',
      message: 'Use the selected vehicle to open a customer-safe insurance request.',
      ctaLabel: 'Begin intake',
      routeKey: 'request',
      statusLabel: 'Ready',
      tone: 'default',
    },
  )
})

test('insurance hero prioritizes document follow-up when files are still missing', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios · DEMOREV001',
      latestInquiry: {
        id: 'inq-7',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [
        { type: 'policy', label: 'Policy copy' },
        { type: 'valid_id', label: 'Valid ID' },
      ],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Current request',
      title: 'Upload required documents',
      message: '2 required documents still need attention for this request.',
      ctaLabel: 'Open documents',
      routeKey: 'documents',
      statusLabel: '2 missing',
      tone: 'warning',
    },
  )
})

test('insurance hero routes payment-overdue requests into payment follow-up', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios Â· DEMOREV001',
      latestInquiry: {
        id: 'inq-9',
        status: 'payment_pending',
        paymentStatus: 'overdue',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Current request',
      title: 'Payment is overdue',
      message: 'Upload proof of payment or contact staff so the request can move forward.',
      ctaLabel: 'Open payment',
      routeKey: 'payment',
      statusLabel: 'Overdue',
      tone: 'danger',
    },
  )
})

test('insurance hero routes renewal follow-up requests into renewal review', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios Â· DEMOREV001',
      latestInquiry: {
        id: 'inq-10',
        status: 'for_renewal',
        paymentStatus: 'paid',
        renewalStatus: 'awaiting_customer',
      },
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 0,
    }),
    {
      eyebrow: 'Current request',
      title: 'Review renewal follow-up',
      message: 'Renewal follow-up is active for this vehicle.',
      ctaLabel: 'Open renewal',
      routeKey: 'renewal',
      statusLabel: 'Awaiting Customer',
      tone: 'default',
    },
  )
})

test('insurance hero routes the active request summary into the request panel', () => {
  assert.deepEqual(
    buildCustomerInsuranceHeroState({
      selectedVehicleLabel: '2024 Toyota Vios • DEMOREV001',
      latestInquiry: {
        id: 'inq-18',
        status: 'active',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 2,
    }),
    {
      eyebrow: 'Current request',
      title: 'Review current request',
      message: 'Open the request panel to review the latest inquiry alongside vehicle history.',
      ctaLabel: 'Open request',
      routeKey: 'request',
      statusLabel: 'Active',
      tone: 'success',
    },
  )
})

test('entry state keeps the app-level insurance tab lightweight', () => {
  assert.deepEqual(
    buildCustomerInsuranceEntryState({
      selectedVehicleLabel: '2024 Toyota Vios • DEMOREV001',
      latestInquiry: null,
      reminderCount: 2,
    }),
    {
      title: 'Protection center',
      summary: 'Open the dedicated insurance workspace for requests, documents, updates, and history.',
      vehicleLabel: '2024 Toyota Vios • DEMOREV001',
      statusLabel: 'Ready',
      ctaLabel: 'Enter insurance mode',
      reminderLabel: '2 reminders',
      tone: 'default',
    },
  )
})

test('overview state routes users to the best next action inside insurance mode', () => {
  assert.deepEqual(
    buildCustomerInsuranceOverviewState({
      selectedVehicleLabel: '2024 Toyota Vios • DEMOREV001',
      latestInquiry: {
        id: 'inq-18',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [{ type: 'valid_id', label: 'Valid ID' }],
      historyCount: 0,
    }),
    {
      title: 'Upload required documents',
      message: 'One required file is blocking review for this request.',
      ctaLabel: 'Open docs',
      routeKey: 'documents',
      routeRows: [
        { key: 'request', label: 'Request', helper: 'Review the request details and customer-safe notes.' },
        { key: 'documents', label: 'Documents', helper: 'Upload the missing file and review what is already on file.' },
        { key: 'status', label: 'Status', helper: 'See the current blocker, timeline, and latest update.' },
        { key: 'history', label: 'History', helper: 'Past completed insurance records for this vehicle.' },
      ],
    },
  )
})

test('overview state pluralizes missing-document guidance for multiple files', () => {
  assert.deepEqual(
    buildCustomerInsuranceOverviewState({
      latestInquiry: {
        id: 'inq-19',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [
        { type: 'policy', label: 'Policy copy' },
        { type: 'valid_id', label: 'Valid ID' },
      ],
    }).message,
    '2 required files are blocking review for this request.',
  )
})

test('status state folds payment and renewal into one tracking model', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'payment_pending',
        paymentStatus: 'awaiting_payment',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Payment instructions are ready.',
    }),
    {
      title: 'Payment follow-up',
      summary: 'Payment is the current blocker for this request.',
      ctaLabel: 'Review payment',
      ctaRouteKey: 'status',
      latestUpdateLabel: 'Payment instructions are ready.',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: true },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    },
  )
})

test('status state prioritizes renewal follow-up before payment follow-up', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'for_renewal',
        paymentStatus: 'paid',
        renewalStatus: 'awaiting_customer',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Renewal follow-up is waiting on the customer.',
    }),
    {
      title: 'Renewal follow-up',
      summary: 'Renewal is the current blocker for this request.',
      ctaLabel: 'Review renewal',
      ctaRouteKey: 'status',
      latestUpdateLabel: 'Renewal follow-up is waiting on the customer.',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: true },
      ],
    },
  )
})

test('status state keeps completed renewal out of the active blocker model', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'closed',
        paymentStatus: 'paid',
        renewalStatus: 'renewed',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Renewal completed.',
    }),
    {
      title: 'Current request status',
      summary: 'Review the latest customer-safe update and next step.',
      ctaLabel: 'Review status',
      ctaRouteKey: 'status',
      latestUpdateLabel: 'Renewal completed.',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    },
  )
})

test('status state keeps the empty default case on the current request fallback', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: null,
      missingRequiredDocuments: [],
      latestUpdateLabel: '--',
    }),
    {
      title: 'Current request status',
      summary: 'Review the latest customer-safe update and next step.',
      ctaLabel: 'Review status',
      ctaRouteKey: 'status',
      latestUpdateLabel: '--',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    },
  )
})

test('status state keeps terminal closed, cancelled, and rejected cases on the fallback model', () => {
  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'closed',
        paymentStatus: 'paid',
        renewalStatus: 'renewed',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Closed request.',
    }),
    {
      title: 'Current request status',
      summary: 'Review the latest customer-safe update and next step.',
      ctaLabel: 'Review status',
      ctaRouteKey: 'status',
      latestUpdateLabel: 'Closed request.',
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    },
  )

  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'cancelled',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Cancelled request.',
    }).timeline,
    [
      { key: 'request', label: 'Request submitted', active: true },
      { key: 'documents', label: 'Documents complete', active: true },
      { key: 'payment', label: 'Payment follow-up', active: false },
      { key: 'renewal', label: 'Renewal', active: false },
    ],
  )

  assert.deepEqual(
    buildCustomerInsuranceStatusState({
      latestInquiry: {
        status: 'rejected',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [],
      latestUpdateLabel: 'Rejected request.',
    }).timeline,
    [
      { key: 'request', label: 'Request submitted', active: true },
      { key: 'documents', label: 'Documents complete', active: true },
      { key: 'payment', label: 'Payment follow-up', active: false },
      { key: 'renewal', label: 'Renewal', active: false },
    ],
  )
})

test('insurance action cards expose focused destinations for the hybrid home', () => {
  assert.deepEqual(
    buildCustomerInsuranceActionCards({
      latestInquiry: {
        id: 'inq-8',
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
      },
      requirementsChecklist: {
        required: [
          { type: 'or_cr', complete: true },
          { type: 'policy', complete: false },
          { type: 'valid_id', complete: false },
        ],
        optional: [],
      },
      claimStatusUpdateCount: 3,
      paymentSummary: {
        title: 'Proof submitted',
        message: 'Proof of payment is on file and waiting for review.',
        tone: 'default',
      },
      renewalSummary: {
        title: 'Renewal reminder',
        message: 'Your renewal window is coming up.',
        tone: 'default',
      },
    }).map(({ key, title, routeKey, value }) => ({ key, title, routeKey, value })),
    [
      { key: 'documents', title: 'Documents', routeKey: 'documents', value: '1/3' },
      { key: 'payment', title: 'Payment', routeKey: 'payment', value: 'Proof Submitted' },
      { key: 'renewal', title: 'Renewal', routeKey: 'renewal', value: 'Upcoming' },
      { key: 'history', title: 'History', routeKey: 'history', value: '3' },
    ],
  )
})

test('insurance action cards keep first-run documents guidance from sounding complete', () => {
  assert.deepEqual(
    buildCustomerInsuranceActionCards({
      latestInquiry: null,
      requirementsChecklist: {
        required: [],
        optional: [],
      },
      claimStatusUpdateCount: 0,
      paymentSummary: null,
      renewalSummary: null,
    }),
    [
      {
        key: 'documents',
        title: 'Documents',
        routeKey: 'documents',
        value: '0/0',
        description: 'Start a request to see what documents will be required.',
      },
      {
        key: 'payment',
        title: 'Payment',
        routeKey: 'payment',
        value: 'Not required',
        description: 'Payment follow-up will appear here when needed.',
      },
      {
        key: 'renewal',
        title: 'Renewal',
        routeKey: 'renewal',
        value: 'Not applicable',
        description: 'Renewal follow-up will appear here when needed.',
      },
      {
        key: 'history',
        title: 'History',
        routeKey: 'history',
        value: '0',
        description:
          'Past insurance records will appear here after staff close and record them.',
      },
    ],
  )
})

test('insurance home focus prioritizes missing-document follow-up when requirements are still incomplete', () => {
  assert.deepEqual(
    buildCustomerInsuranceHomeFocus({
      latestInquiry: {
        id: 'inq-1',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      missingRequiredDocuments: [
        { type: 'policy', label: 'Policy copy' },
        { type: 'valid_id', label: 'Valid ID' },
      ],
      claimStatusUpdateCount: 0,
    }),
    {
      icon: 'file-document-alert-outline',
      title: 'Upload required documents',
      message:
        '2 required documents still need attention before the review can continue.',
      actionLabel: 'Upload now',
      tone: 'warning',
      highlightedCardKey: 'documents',
    },
  )
})

test('insurance home focus falls back to vehicle history once there is no active request', () => {
  assert.deepEqual(
    buildCustomerInsuranceHomeFocus({
      latestInquiry: null,
      missingRequiredDocuments: [],
      claimStatusUpdateCount: 3,
    }),
    {
      icon: 'history',
      title: 'Insurance history available',
      message: '3 recorded insurance updates are already available for this vehicle.',
      actionLabel: 'Review history',
      tone: 'default',
      highlightedCardKey: 'history',
    },
  )
})

test('insurance home focus keeps first-run users on start even when checklist defaults would be incomplete', () => {
  assert.deepEqual(
    buildCustomerInsuranceHomeFocus({
      latestInquiry: null,
      missingRequiredDocuments: [
        { type: 'or_cr', label: 'OR/CR' },
        { type: 'policy', label: 'Policy copy' },
      ],
      claimStatusUpdateCount: 0,
    }),
    {
      icon: 'shield-plus-outline',
      title: 'Start a fresh request',
      message:
        'Begin with a short concern summary, then use this same screen to upload documents and track the workflow.',
      actionLabel: 'Start now',
      tone: 'default',
      highlightedCardKey: 'start',
    },
  )
})

test('requirements checklist separates required and optional documents', () => {
  const checklist = buildRequirementsChecklist({
    status: 'needs_documents',
    uploadedTypes: ['or_cr'],
  })

  assert.equal(checklist.required.find((item) => item.type === 'or_cr')?.complete, true)
  assert.equal(checklist.required.find((item) => item.type === 'policy')?.complete, false)
  assert.equal(Array.isArray(checklist.optional), true)
  assert.equal(checklist.status, 'needs_documents')
})

test('customer timeline shows submitted, review, and document follow-up states', () => {
  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'needs_documents',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }).map((step) => step.key),
    ['submitted', 'review', 'documents'],
  )
})

test('customer timeline keeps under_review on an active review step', () => {
  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'under_review',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }),
    [
      { key: 'submitted', label: 'Submitted', state: 'done' },
      { key: 'review', label: 'In Review', state: 'current' },
    ],
  )
})

test('customer timeline maps phase-1 workflow statuses to explicit steps', () => {
  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'for_approval',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }).map((step) => step.key),
    ['submitted', 'review', 'approval'],
  )

  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'not_applicable',
    }).map((step) => step.key),
    ['submitted', 'review', 'payment'],
  )

  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'for_renewal',
      paymentStatus: 'paid',
      renewalStatus: 'upcoming',
    }).map((step) => step.key),
    ['submitted', 'review', 'payment', 'renewal'],
  )

  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'rejected',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }).map((step) => step.key),
    ['submitted', 'review', 'rejected'],
  )

  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'cancelled',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    }).map((step) => step.key),
    ['submitted', 'cancelled'],
  )
})

test('customer timeline includes payment pending and renewal prompts', () => {
  assert.deepEqual(
    getCustomerInsuranceTimeline({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
    }).map((step) => step.key),
    ['submitted', 'review', 'payment', 'renewal'],
  )
})

test('payment follow-up prompt includes overdue urgency with overdue days', () => {
  assert.deepEqual(
    getCustomerInsurancePaymentSummary({
      status: 'payment_pending',
      paymentStatus: 'overdue',
      paymentDueAt: '2026-05-10T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    {
      title: 'Payment overdue',
      message:
        'This request is 4 days overdue for payment. Upload proof after payment or contact staff for help.',
      tone: 'danger',
    },
  )
})

test('payment follow-up prompt shows a visible due date for active payment follow-up', () => {
  assert.deepEqual(
    getCustomerInsurancePaymentSummary({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
      paymentDueAt: '2026-05-18T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    {
      title: 'Proof submitted',
      message:
        'Your proof of payment is on file. Staff still need to verify it before the request moves forward. Due date: May 18, 2026.',
      tone: 'default',
    },
  )
})

test('createPickedInsuranceDocumentDraft maps a selected asset into upload-ready fields', () => {
  assert.deepEqual(
    createPickedInsuranceDocumentDraft({
      documentType: 'proof_of_payment',
      asset: {
        name: 'receipt.jpg',
        uri: 'file:///receipt.jpg',
        mimeType: 'image/jpeg',
        size: 245760,
      },
    }),
    {
      documentType: 'proof_of_payment',
      fileName: 'receipt.jpg',
      fileUri: 'file:///receipt.jpg',
      mimeType: 'image/jpeg',
      notes: '',
      fileSizeLabel: '240 KB',
    },
  )
})

test('remembered inquiry ids can resume a vehicle-specific in-flight request', () => {
  clearRememberedInquiryForVehicle('vehicle-1')

  assert.equal(getRememberedInquiryForVehicle('vehicle-1'), null)

  rememberInquiryForVehicle({
    vehicleId: 'vehicle-1',
    inquiryId: 'inq-1',
  })

  assert.equal(getRememberedInquiryForVehicle('vehicle-1'), 'inq-1')

  clearRememberedInquiryForVehicle('vehicle-1')

  assert.equal(getRememberedInquiryForVehicle('vehicle-1'), null)
})

test('terminal inquiries suppress payment and renewal follow-up even with stale tags', () => {
  assert.equal(
    shouldShowCustomerInsuranceFollowUp({
      status: 'closed',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      followUpType: 'payment',
    }),
    false,
  )

  assert.equal(
    shouldShowCustomerInsuranceFollowUp({
      status: 'rejected',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      followUpType: 'renewal',
    }),
    false,
  )
})

test('remembered inquiry mappings can round-trip through persisted storage data', () => {
  clearRememberedInquiryForVehicle('vehicle-2')

  rememberInquiryForVehicle({
    vehicleId: 'vehicle-2',
    inquiryId: 'inq-2',
  })

  const serialized = serializeRememberedInquiryMappings()

  clearRememberedInquiryForVehicle('vehicle-2')
  assert.equal(getRememberedInquiryForVehicle('vehicle-2'), null)

  hydrateRememberedInquiryMappings(serialized)

  assert.equal(getRememberedInquiryForVehicle('vehicle-2'), 'inq-2')

  clearRememberedInquiryForVehicle('vehicle-2')
})

test('tracking refresh waits until the selected vehicle remembered-inquiry lookup has settled', () => {
  assert.equal(
    shouldDeferCustomerInsuranceTrackingRefresh({
      hasHydratedRememberedInquiryMappings: false,
      knownInquiryId: null,
    }),
    true,
  )

  assert.equal(
    shouldDeferCustomerInsuranceTrackingRefresh({
      hasHydratedRememberedInquiryMappings: false,
      knownInquiryId: 'inq-3',
    }),
    false,
  )

  assert.equal(
    shouldDeferCustomerInsuranceTrackingRefresh({
      hasHydratedRememberedInquiryMappings: true,
      settledRememberedInquiryIdForSelectedVehicle: undefined,
      knownInquiryId: null,
    }),
    true,
  )

  assert.equal(
    shouldDeferCustomerInsuranceTrackingRefresh({
      hasHydratedRememberedInquiryMappings: true,
      settledRememberedInquiryIdForSelectedVehicle: 'inq-4',
      knownInquiryId: null,
    }),
    true,
  )

  assert.equal(
    shouldDeferCustomerInsuranceTrackingRefresh({
      hasHydratedRememberedInquiryMappings: true,
      settledRememberedInquiryIdForSelectedVehicle: null,
      knownInquiryId: null,
    }),
    false,
  )
})

test('vehicle-scoped inquiry identity drops stale inquiry ids from a different vehicle', () => {
  assert.equal(
    getVehicleScopedCustomerInquiryId({
      selectedVehicleId: 'vehicle-b',
      latestInquiryId: 'inq-a',
      latestInquiryVehicleId: 'vehicle-a',
      rememberedInquiryId: null,
    }),
    null,
  )

  assert.equal(
    getVehicleScopedCustomerInquiryId({
      selectedVehicleId: 'vehicle-b',
      latestInquiryId: 'inq-a',
      latestInquiryVehicleId: 'vehicle-a',
      rememberedInquiryId: 'inq-b',
    }),
    'inq-b',
  )

  assert.equal(
    getVehicleScopedCustomerInquiryId({
      selectedVehicleId: 'vehicle-b',
      routeInquiryId: 'inq-route',
      latestInquiryId: 'inq-a',
      latestInquiryVehicleId: 'vehicle-a',
      rememberedInquiryId: null,
    }),
    'inq-route',
  )
})

test('vehicle matching rejects inquiries that belong to a different vehicle context', () => {
  assert.equal(
    doesCustomerInsuranceInquiryMatchVehicle({
      inquiry: {
        id: 'inq-a',
        vehicleId: 'vehicle-a',
      },
      vehicleId: 'vehicle-b',
    }),
    false,
  )

  assert.equal(
    doesCustomerInsuranceInquiryMatchVehicle({
      inquiry: {
        id: 'inq-b',
        vehicleId: 'vehicle-b',
      },
      vehicleId: 'vehicle-b',
    }),
    true,
  )
})

test('normalizeCustomerInsuranceInquiry keeps only workflow metadata needed for helper behavior', () => {
  assert.deepEqual(
    normalizeCustomerInsuranceInquiry({
      id: 'inq-1',
      inquiryType: 'comprehensive',
      subject: 'Insurance follow-up',
      description: 'Customer inquiry',
      status: 'payment_pending',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      documents: [],
    }),
    {
      id: 'inq-1',
      userId: null,
      vehicleId: null,
      inquiryType: 'comprehensive',
      inquiryTypeLabel: 'Comprehensive',
      subject: 'Insurance follow-up',
      description: 'Customer inquiry',
      status: 'payment_pending',
      statusHint: 'A payment step is still in progress for this inquiry.',
      documentStatus: 'complete',
      paymentStatus: 'proof_submitted',
      renewalStatus: 'upcoming',
      providerName: null,
      policyNumber: null,
      notes: null,
      documentCount: 0,
      documents: [],
      canAttachDocuments: true,
      createdAt: null,
      updatedAt: null,
    },
  )
})

test('uploadInsuranceInquiryDocumentFile posts multipart form data without forcing json headers', async () => {
  const originalFetch = globalThis.fetch
  const originalFormData = globalThis.FormData
  const originalInsuranceClientRuntime = globalThis.__insuranceClientRuntime
  const calls = []

  class FakeFormData {
    constructor() {
      this.fields = []
    }

    append(key, value) {
      this.fields.push([key, value])
    }
  }

  globalThis.FormData = FakeFormData
  globalThis.__insuranceClientRuntime = {
    ApiError: class ApiError extends Error {
      constructor(message, status, details) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
      }
    },
    getApiBaseUrl: () => 'http://127.0.0.1:3000',
  }
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })

    return new Response(
      JSON.stringify({
        id: 'inq-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        subject: 'Upload proof',
        description: 'Customer uploaded a file.',
        status: 'needs_documents',
        documents: [
          {
            id: 'doc-1',
            inquiryId: 'inq-1',
            fileName: 'proof-of-payment.pdf',
            fileUrl: 'upload://insurance/inq-1/proof-of-payment.pdf',
            documentType: 'proof_of_payment',
            notes: 'Payment slip',
          },
        ],
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
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
    await uploadInsuranceInquiryDocumentFile({
      inquiryId: 'inq-1',
      documentType: 'proof_of_payment',
      file: { uri: 'file:///proof-of-payment.pdf', name: 'proof-of-payment.pdf', type: 'application/pdf' },
      notes: 'Payment slip',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.FormData = originalFormData
    globalThis.__insuranceClientRuntime = originalInsuranceClientRuntime
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.endsWith('/api/insurance/inquiries/inq-1/documents/upload'), true)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-1')
  assert.equal('Content-Type' in calls[0].options.headers, false)
  assert.equal(calls[0].options.body instanceof FakeFormData, true)
  assert.deepEqual(calls[0].options.body.fields, [
    ['file', { uri: 'file:///proof-of-payment.pdf', name: 'proof-of-payment.pdf', type: 'application/pdf' }],
    ['documentType', 'proof_of_payment'],
    ['notes', 'Payment slip'],
  ])
})

test('addInsuranceInquiryDocument reports the full accepted document types', async () => {
  const originalInsuranceClientRuntime = globalThis.__insuranceClientRuntime

  globalThis.__insuranceClientRuntime = {
    ApiError: class ApiError extends Error {
      constructor(message, status, details) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
      }
    },
    getApiBaseUrl: () => 'http://127.0.0.1:3000',
  }

  try {
    await assert.rejects(
      addInsuranceInquiryDocument({
        inquiryId: 'inq-1',
        documentType: 'not_real',
        fileName: 'doc.pdf',
        fileUrl: 'upload://insurance/inq-1/doc.pdf',
      }),
      (error) => {
        assert.equal(error.message, 'Choose a valid document type: OR/CR, policy, valid ID, police report, photo, estimate, proof of payment, or other.')
        return true
      },
    )
  } finally {
    globalThis.__insuranceClientRuntime = originalInsuranceClientRuntime
  }
})

test('normalizeCustomerInsuranceInquiry does not preserve legacy approved_for_record copy', () => {
  const inquiry = normalizeCustomerInsuranceInquiry({
    id: 'inq-legacy',
    status: 'approved_for_record',
    documents: [],
  })

  assert.equal(inquiry?.status, 'approved_for_record')
  assert.equal(inquiry?.statusHint, 'Insurance tracking is available for this request.')
})
