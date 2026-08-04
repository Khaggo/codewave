import assert from 'node:assert/strict'
import test from 'node:test'

import {
  INSURANCE_MODE_TABS,
  buildInsuranceContentInsets,
  canOpenInsuranceVehiclePicker,
  insuranceModeUsesPanelScroll,
  resolveInsuranceModeTab,
} from './insurance/insuranceModeModel.mjs'
import {
  INSURANCE_REQUEST_STAGES,
  buildAuthoritativeRequirementsChecklist,
  validateInsuranceRequestStage,
} from './insurance/insuranceRequestFlow.mjs'

test('insurance exposes four direct destinations with a safe home fallback', () => {
  assert.deepEqual(
    INSURANCE_MODE_TABS.map(({ key, label }) => ({ key, label })),
    [
      { key: 'home', label: 'Home' },
      { key: 'request', label: 'Request' },
      { key: 'documents', label: 'Documents' },
      { key: 'status', label: 'Status' },
    ],
  )
  assert.equal(resolveInsuranceModeTab('documents'), 'documents')
  assert.equal(resolveInsuranceModeTab('unknown'), 'home')
  assert.equal(resolveInsuranceModeTab(null), 'home')
})

test('only work-heavy insurance panels own their internal scroll region', () => {
  assert.equal(insuranceModeUsesPanelScroll('home'), false)
  assert.equal(insuranceModeUsesPanelScroll('request'), true)
  assert.equal(insuranceModeUsesPanelScroll('documents'), true)
  assert.equal(insuranceModeUsesPanelScroll('status'), true)
  assert.equal(insuranceModeUsesPanelScroll('unknown'), false)
})

test('insurance vehicle switching requires both a customer session and vehicles', () => {
  assert.equal(
    canOpenInsuranceVehiclePicker({
      hasSession: true,
      ownedVehicles: [{ id: 'vehicle-1' }],
    }),
    true,
  )
  assert.equal(
    canOpenInsuranceVehiclePicker({
      hasSession: false,
      ownedVehicles: [{ id: 'vehicle-1' }],
    }),
    false,
  )
  assert.equal(
    canOpenInsuranceVehiclePicker({
      hasSession: true,
      ownedVehicles: [],
    }),
    false,
  )
  assert.equal(
    canOpenInsuranceVehiclePicker({
      hasSession: true,
      ownedVehicles: null,
    }),
    false,
  )
})

test('insurance content preserves safe-area insets without shrinking minimum spacing', () => {
  assert.deepEqual(buildInsuranceContentInsets({ top: 0, bottom: 0 }), {
    paddingTop: 18,
    paddingBottom: 24,
  })
  assert.deepEqual(buildInsuranceContentInsets({ top: 44, bottom: 34 }), {
    paddingTop: 44,
    paddingBottom: 34,
  })
})

test('insurance request remains a three-stage guided flow with server-owned documents', () => {
  assert.deepEqual(
    INSURANCE_REQUEST_STAGES.map(({ key, label }) => ({ key, label })),
    [
      { key: 'reason', label: 'Reason & Coverage' },
      { key: 'details', label: 'Details' },
      { key: 'documents', label: 'Documents & Review' },
    ],
  )

  const checklist = buildAuthoritativeRequirementsChecklist({
    requirements: {
      purpose: 'renewal',
      requiredDocumentTypes: ['or_cr', 'policy'],
      optionalDocumentTypes: ['valid_id'],
    },
    uploadedTypes: ['or_cr'],
    documentTypeOptions: [
      { value: 'or_cr', label: 'OR/CR' },
      { value: 'policy', label: 'Existing policy' },
      { value: 'valid_id', label: 'Valid ID' },
    ],
  })

  assert.deepEqual(
    checklist.required.map((item) => item.type),
    ['or_cr', 'policy'],
  )
  assert.deepEqual(
    checklist.optional.map((item) => item.type),
    ['valid_id'],
  )
  assert.equal(checklist.required[0].complete, true)
  assert.equal(checklist.required[1].complete, false)
  assert.deepEqual(
    validateInsuranceRequestStage({
      stageIndex: 0,
      draft: { purpose: '', inquiryType: '' },
    }),
    {
      field: 'purpose',
      message: 'Choose what you need help with.',
    },
  )
})
