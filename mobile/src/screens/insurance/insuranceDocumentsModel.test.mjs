import assert from 'node:assert/strict'
import test from 'node:test'

import { buildInsuranceDocumentsViewModel } from './insuranceDocumentsModel.mjs'

test('Insurance documents model groups requirements and reports completion', () => {
  const model = buildInsuranceDocumentsViewModel({
    checklist: {
      required: [
        { type: 'or_cr', complete: true },
        { type: 'policy', complete: false },
      ],
      supporting: [{ type: 'photo', complete: false }],
      optional: [{ type: 'other', complete: false }],
      guidance: ['Upload readable files.'],
    },
    latestInquiry: {
      documents: [{ id: 'document-1' }],
    },
  })

  assert.equal(model.requiredCompleteCount, 1)
  assert.equal(model.requiredTotalCount, 2)
  assert.equal(model.onFileCount, 1)
  assert.deepEqual(model.guidance, ['Upload readable files.'])
  assert.equal(model.checklistGroups.supporting.length, 1)
  assert.equal(model.checklistGroups.optional.length, 1)
})

test('Insurance documents model labels pending uploads from authoritative options', () => {
  const model = buildInsuranceDocumentsViewModel({
    documentTypeOptions: [
      { value: 'official_receipt', label: 'Official receipt' },
    ],
    pendingUploads: [
      { documentType: 'official_receipt', fileName: 'receipt.pdf' },
      { documentType: 'custom_type', fileName: 'other.pdf' },
      { fileName: 'unknown.pdf' },
    ],
  })

  assert.deepEqual(
    model.pendingUploadRows.map((item) => item.documentTypeLabel),
    ['Official receipt', 'custom_type', 'Document'],
  )
})

test('Insurance documents model treats malformed collections as empty', () => {
  const model = buildInsuranceDocumentsViewModel({
    checklist: null,
    documentTypeOptions: null,
    latestInquiry: { documents: 'invalid' },
    pendingUploads: {},
  })

  assert.deepEqual(model.checklistGroups, {
    required: [],
    supporting: [],
    optional: [],
  })
  assert.deepEqual(model.documents, [])
  assert.deepEqual(model.pendingUploadRows, [])
  assert.equal(model.requiredTotalCount, 0)
})

test('Insurance documents model removes duplicate types from lower-priority groups', () => {
  const model = buildInsuranceDocumentsViewModel({
    checklist: {
      required: [{ type: 'or_cr', label: 'OR/CR' }],
      supporting: [
        { type: 'policy', label: 'Policy copy' },
        { type: 'photo', label: 'Damage photo' },
      ],
      optional: [
        { type: 'photo', label: 'Damage photo' },
        { type: 'other', label: 'Other document' },
      ],
    },
  })

  assert.deepEqual(
    model.checklistGroups.optional.map((item) => item.type),
    ['other'],
  )
})
