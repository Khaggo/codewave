import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIntakeInspectionNotes,
  buildIntakeInspectionPayload,
  createInitialIntakeDraft,
  getIntakeRequirementOptions,
  getReasonForVisitOptions,
  resolveIntakeNextRoute,
  sanitizeIntakeOdometer,
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

  assert.match(payload.notes, /Arrival mode: With Booking/)
  assert.match(payload.notes, /Visit type: Insurance Related/)
  assert.match(payload.notes, /Reason for visit: Customer arrived for insurance claim support\./)
  assert.match(payload.notes, /Requested service summary: Front bumper damage assessment\./)
  assert.match(payload.notes, /Repeat visit: Yes/)
  assert.match(payload.notes, /Urgent visit: Yes/)
  assert.match(payload.notes, /Next route: Insurance/)
  assert.match(payload.notes, /Missing requirements note: Customer still needs to upload additional claim photos\./)
  assert.match(payload.notes, /Booking confirmed: Present/)
  assert.match(payload.notes, /Supporting docs present: Missing/)
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

  assert.equal(payload.inspectionType, 'intake')
  assert.equal(payload.status, 'pending')
  assert.match(payload.notes, /Arrival mode: Walk In/)
  assert.match(payload.notes, /Visit type: Regular Service/)
  assert.match(payload.notes, /Next route: Service/)
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

  assert.match(payload.notes, /Booking confirmed: Present/)
  assert.match(payload.notes, /OR\/CR present: Missing/)
})

test('getReasonForVisitOptions follows visit type and preserves loaded legacy values', () => {
  assert.deepEqual(getReasonForVisitOptions({ visitType: 'inspection_only' }), [
    'General inspection',
    'Pre-purchase inspection',
    'Roadworthy or safety inspection',
    'Insurance documentation inspection',
    'Diagnostic inspection',
  ])

  assert.deepEqual(
    getReasonForVisitOptions({
      visitType: 'regular_service',
      currentValue: 'Customer arrived for insurance claim support.',
    }).slice(0, 3),
    [
      'Customer arrived for insurance claim support.',
      'Preventive maintenance',
      'Oil change / PMS',
    ],
  )
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
  assert.match(payload.notes, /REQUIREMENTS CHECKLIST/)
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
  assert.match(payload.notes, /CUSTOMER ACKNOWLEDGMENT/)
  assert.match(payload.notes, /Customer signature:/)
})

test('buildIntakeInspectionPayload defaults regular service to service routing', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      visitType: 'regular_service',
      nextRoute: 'insurance',
    },
    userId: 'staff-77',
  })

  assert.match(payload.notes, /Next route: Service/)
})

test('buildIntakeInspectionPayload keeps insurance-related routing when selected', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      visitType: 'insurance_related',
      nextRoute: 'service',
    },
    userId: 'staff-78',
  })

  assert.match(payload.notes, /Next route: Insurance/)
})

test('resolveIntakeNextRoute follows visit-type intent over stale route values', () => {
  assert.equal(resolveIntakeNextRoute('regular_service', 'insurance'), 'service')
  assert.equal(resolveIntakeNextRoute('insurance_related', 'service'), 'insurance')
  assert.equal(resolveIntakeNextRoute('back_job_complaint', 'inspection'), 'complaint')
})

test('getIntakeRequirementOptions keeps booking optional for walk-ins', () => {
  const options = getIntakeRequirementOptions({
    arrivalType: 'walk_in',
    visitType: 'regular_service',
  })

  assert.deepEqual(
    options.map(({ value, required }) => ({ value, required })),
    [
      { value: 'bookingFound', required: false },
      { value: 'orCrPresent', required: true },
    ],
  )
})

test('getIntakeRequirementOptions surfaces insurance-specific requirement checks', () => {
  const options = getIntakeRequirementOptions({
    arrivalType: 'with_booking',
    visitType: 'insurance_related',
  })

  assert.deepEqual(
    options.map(({ value, required }) => ({ value, required })),
    [
      { value: 'bookingFound', required: true },
      { value: 'orCrPresent', required: true },
      { value: 'validIdPresent', required: true },
      { value: 'oldPolicyPresent', required: true },
      { value: 'supportingDocsPresent', required: true },
    ],
  )
})

test('sanitizeIntakeOdometer strips non-digit input before the payload is built', () => {
  assert.equal(sanitizeIntakeOdometer('45,230 km'), '45230')
  assert.equal(sanitizeIntakeOdometer('odo-ABC-123'), '123')
  assert.equal(sanitizeIntakeOdometer(''), '')
})

test('buildIntakeInspectionPayload stores a numeric odometer even when the draft input contains mixed characters', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      currentOdometerKm: '45,230 km',
    },
    userId: 'staff-88',
  })

  assert.match(payload.notes, /Current odometer \(km\): 45230/)
})
