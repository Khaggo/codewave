import assert from 'node:assert/strict'
import test from 'node:test'

import { uploadInsuranceInquiryDocumentFile } from './insuranceClient.js'

test('uploadInsuranceInquiryDocumentFile uses the browser File handle for web multipart uploads', async () => {
  const originalFetch = globalThis.fetch
  const originalFormData = globalThis.FormData
  const originalInsuranceClientRuntime = globalThis.__insuranceClientRuntime
  const fields = []
  const webFile = new Blob(['%PDF-1.4\n'], { type: 'application/pdf' })

  class FakeFormData {
    append(key, value, fileName) {
      fields.push(fileName ? [key, value, fileName] : [key, value])
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
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'inq-web',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        subject: 'Upload proof',
        description: 'Customer uploaded a browser file.',
        status: 'needs_documents',
        documents: [],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

  try {
    await uploadInsuranceInquiryDocumentFile({
      inquiryId: 'inq-web',
      documentType: 'or_cr',
      file: {
        uri: 'blob:http://127.0.0.1/file',
        name: 'registration.pdf',
        type: 'application/pdf',
        webFile,
      },
      accessToken: 'token-1',
    })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.FormData = originalFormData
    globalThis.__insuranceClientRuntime = originalInsuranceClientRuntime
  }

  assert.deepEqual(fields, [
    ['file', webFile, 'registration.pdf'],
    ['documentType', 'or_cr'],
  ])
})
