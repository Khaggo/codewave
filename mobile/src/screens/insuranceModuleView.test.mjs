import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRequirementsChecklist,
  getCustomerInsuranceTimeline,
  getInsuranceHomeCards,
} from './insuranceModuleView.mjs'
import { uploadInsuranceInquiryDocumentFile } from '../lib/insuranceClient.js'

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
