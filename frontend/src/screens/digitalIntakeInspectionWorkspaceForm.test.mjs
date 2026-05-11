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
