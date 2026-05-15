import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIntakeInspectionNotes,
  buildIntakeInspectionPayload,
  createInitialIntakeDraft,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

test('createInitialIntakeDraft returns the intake defaults', () => {
  assert.deepEqual(createInitialIntakeDraft(), {
    customerUserId: '',
    vehicleId: '',
    bookingId: '',
    status: 'pending',
    notes: '',
    arrivalType: 'walk_in',
    visitType: 'regular_service',
    reasonForVisit: '',
    requestedServiceSummary: '',
    isRepeatVisit: false,
    urgencyFlag: false,
    requirementsChecklist: {
      bookingFound: false,
      orCrPresent: false,
      validIdPresent: false,
      oldPolicyPresent: false,
      supportingDocsPresent: false,
    },
    missingRequirementsNote: '',
    nextRoute: 'service',
    serviceConcern: '',
    currentOdometerKm: '',
    fuelLevel: '1/2',
    damageAreas: [],
    damageNotes: '',
    customerItems: '',
    customerAcknowledged: false,
    customerSignatureName: '',
    receivedByStaff: '',
    arrivalPhotos: {
      front: '',
      rear: '',
      leftSide: '',
      rightSide: '',
      dashboardOdometer: '',
      interior: '',
      damageCloseup: '',
      additional: '',
    },
    checklist: {
      batteryCondition: 'ok',
      engineOilLevel: 'ok',
      coolantLevel: 'ok',
      tirePressure: 'ok',
      allLightsFunctional: 'ok',
      brakePedalFeel: 'ok',
    },
  })
})

test('buildIntakeInspectionPayload preserves intake triage and requirements fields', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      arrivalType: 'with_booking',
      visitType: 'insurance_related',
      reasonForVisit: 'Customer arrived for insurance claim support.',
      requestedServiceSummary: 'Front bumper damage assessment.',
      isRepeatVisit: true,
      urgencyFlag: true,
      requirementsChecklist: {
        bookingFound: true,
        orCrPresent: true,
        validIdPresent: true,
        oldPolicyPresent: true,
        supportingDocsPresent: false,
      },
      missingRequirementsNote: 'Customer still needs to upload additional claim photos.',
      nextRoute: 'insurance',
      notes: 'Arrival inspection will continue below.',
    },
    userId: 'staff-iris',
  })

  assert.equal(payload.arrivalType, 'with_booking')
  assert.equal(payload.visitType, 'insurance_related')
  assert.equal(payload.reasonForVisit, 'Customer arrived for insurance claim support.')
  assert.equal(payload.requestedServiceSummary, 'Front bumper damage assessment.')
  assert.equal(payload.isRepeatVisit, true)
  assert.equal(payload.urgencyFlag, true)
  assert.deepEqual(payload.requirementsChecklist, {
    bookingFound: true,
    orCrPresent: true,
    validIdPresent: true,
    oldPolicyPresent: true,
    supportingDocsPresent: false,
  })
  assert.equal(
    payload.missingRequirementsNote,
    'Customer still needs to upload additional claim photos.',
  )
  assert.equal(payload.nextRoute, 'insurance')
})

test('buildIntakeInspectionPayload normalizes invalid control-field values to stable defaults', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      arrivalType: 'walk_in_with_extremely_long_unexpected_value',
      visitType: 'unknown_route_type',
      nextRoute: 'definitely_not_supported',
    },
    userId: 'staff-11',
  })

  assert.equal(payload.arrivalType, 'walk_in')
  assert.equal(payload.visitType, 'regular_service')
  assert.equal(payload.nextRoute, 'service')
})

test('buildIntakeInspectionPayload coerces partial or missing requirementsChecklist values', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      requirementsChecklist: {
        bookingFound: 1,
        validIdPresent: 'yes',
      },
    },
    userId: 'staff-12',
  })

  assert.deepEqual(payload.requirementsChecklist, {
    bookingFound: true,
    orCrPresent: false,
    validIdPresent: true,
    oldPolicyPresent: false,
    supportingDocsPresent: false,
  })
})

test('buildIntakeInspectionNotes stores intake-only sections in labeled note blocks', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    serviceConcern: 'Brake grinding noise, front left',
    currentOdometerKm: '45230',
    fuelLevel: '5/8',
    damageAreas: ['front_bumper', 'left_side_panels'],
    damageNotes: 'Scratch on left rear door.',
    customerItems: 'Dashcam and parking card',
    customerAcknowledged: true,
    customerSignatureName: 'Juan dela Cruz',
    receivedByStaff: 'staff-1',
    checklist: {
      batteryCondition: 'ok',
      engineOilLevel: 'ok',
      coolantLevel: 'issue',
      tirePressure: 'ok',
      allLightsFunctional: 'ok',
      brakePedalFeel: 'ok',
    },
  }

  const notes = buildIntakeInspectionNotes(draft)

  assert.match(notes, /SERVICE CONCERN/)
  assert.match(notes, /Fuel level on arrival: 5\/8/)
  assert.match(notes, /Damage areas: Front bumper, Left side panels/)
  assert.match(notes, /Coolant level: Issue/)
  assert.match(notes, /Customer signature: Juan dela Cruz/)
})

test('buildIntakeInspectionPayload maps intake fields into the current inspection DTO', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    bookingId: 'booking-9',
    status: 'completed',
    notes:
      'Customer reports vibration at low speed. ' +
      'Please inspect suspension, alignment, and related components. '.repeat(24),
    arrivalPhotos: {
      front: ' upload://vehicle/front ',
      rear: 'upload://vehicle/rear',
      leftSide: 'upload://vehicle/front',
      rightSide: 'upload://vehicle/right',
      dashboardOdometer: 'upload://vehicle/dashboard',
      interior: '   ',
      damageCloseup: 'upload://vehicle/damage',
      additional: 'upload://vehicle/rear',
    },
    damageAreas: ['front_bumper'],
    damageNotes: 'Scuffed lower lip.',
  }

  const payload = buildIntakeInspectionPayload({
    draft,
    userId: 'staff-9',
  })

  assert.equal(payload.inspectionType, 'intake')
  assert.equal(payload.status, 'completed')
  assert.equal(payload.bookingId, 'booking-9')
  assert.equal(payload.inspectorUserId, 'staff-9')
  assert.deepEqual(payload.attachmentRefs, [
    'upload://vehicle/front',
    'upload://vehicle/rear',
    'upload://vehicle/right',
    'upload://vehicle/dashboard',
    'upload://vehicle/damage',
  ])
  assert.ok(payload.notes.length <= 1000)
  assert.match(payload.notes, /SERVICE CONCERN/)
  assert.match(payload.notes, /Fuel level on arrival:/)
  assert.equal(payload.findings.length, 1)
  assert.equal(payload.findings[0].category, 'body')
  assert.equal(payload.findings[0].label, 'Existing damage marked')
  assert.match(payload.findings[0].notes, /Front bumper/)
  assert.match(payload.notes, /Customer reports vibration at low speed/)
})

test('buildIntakeInspectionPayload preserves a pending intake draft status', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    status: 'pending',
    bookingId: 'booking-draft-2',
    currentOdometerKm: '11002',
    fuelLevel: '1/4',
    arrivalPhotos: {
      ...createInitialIntakeDraft().arrivalPhotos,
      front: 'upload://vehicle/front-draft',
    },
  }

  const payload = buildIntakeInspectionPayload({
    draft,
    userId: 'staff-21',
  })

  assert.equal(payload.inspectionType, 'intake')
  assert.equal(payload.status, 'pending')
  assert.equal(payload.bookingId, 'booking-draft-2')
  assert.equal(payload.inspectorUserId, 'staff-21')
  assert.deepEqual(payload.attachmentRefs, ['upload://vehicle/front-draft'])
  assert.equal(payload.findings.length, 0)
  assert.match(payload.notes, /Current odometer \(km\): 11002/)
  assert.match(payload.notes, /Fuel level on arrival: 1\/4/)
})

test('buildIntakeInspectionPayload preserves later intake sections when long text is entered', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    status: 'completed',
    serviceConcern: 'Service concern '.repeat(80),
    damageAreas: ['front_bumper', 'right_side_panels'],
    damageNotes: 'Damage note '.repeat(80),
    customerItems: 'Customer item '.repeat(80),
    customerAcknowledged: true,
    customerSignatureName: 'Signature '.repeat(30),
    receivedByStaff: 'Receiving staff '.repeat(30),
    notes: 'Additional handoff note '.repeat(80),
  }

  const payload = buildIntakeInspectionPayload({
    draft,
    userId: 'staff-55',
  })

  assert.ok(payload.notes.length <= 1000)
  assert.match(payload.notes, /SERVICE CONCERN/)
  assert.match(payload.notes, /PRE-SERVICE CHECKLIST/)
  assert.match(payload.notes, /CUSTOMER ITEMS/)
  assert.match(payload.notes, /CUSTOMER ACKNOWLEDGMENT/)
  assert.match(payload.notes, /Customer signature:/)
  assert.match(payload.notes, /Received by staff:/)
})
