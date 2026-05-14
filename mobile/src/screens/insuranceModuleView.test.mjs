import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRequirementsChecklist,
  clearRememberedInquiryForVehicle,
  createPickedInsuranceDocumentDraft,
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
