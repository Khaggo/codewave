import assert from 'node:assert/strict'
import test from 'node:test'

import { createInsuranceInquiry } from './insuranceClient.js'

test('createInsuranceInquiry sends the web-aligned purpose field to the backend', async () => {
  const originalFetch = globalThis.fetch
  const originalInsuranceClientRuntime = globalThis.__insuranceClientRuntime
  const calls = []

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
        id: 'inq-purpose-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        purpose: 'renewal',
        subject: 'Renewal request',
        description: 'Prepare a renewal quote.',
        status: 'submitted',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        documents: [],
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
    await createInsuranceInquiry({
      userId: 'user-1',
      vehicleId: 'vehicle-1',
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      inquiryType: 'comprehensive',
      purpose: 'renewal',
      subject: ' Renewal request ',
      description: ' Prepare a renewal quote. ',
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.__insuranceClientRuntime = originalInsuranceClientRuntime
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:3000/api/insurance/inquiries')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    userId: 'user-1',
    vehicleId: 'vehicle-1',
    clientRequestId: '11111111-1111-4111-8111-111111111111',
    inquiryType: 'comprehensive',
    purpose: 'renewal',
    subject: 'Renewal request',
    description: 'Prepare a renewal quote.',
  })
})
