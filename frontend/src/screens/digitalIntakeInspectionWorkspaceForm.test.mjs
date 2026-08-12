import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIntakeCompletionReceipt,
  buildIntakeDraftPayload,
  buildIntakeInspectionNotes,
  buildIntakeInspectionPayload,
  buildChecklistIssueValue,
  createInitialIntakeDraft,
  getBookingIntakePrefill,
  getChecklistIssueDetails,
  getChecklistStatus,
  getBookingQueryHydrationState,
  getArrivalInspectionProgress,
  getArrivalInspectionCategoryProgress,
  arrivalInspectionCategoryOptions,
  getCompletedIntakeRequirements,
  getEligibleIntakeBookings,
  getIntakeCompletionBlockers,
  getIntakeRequirementOptions,
  getReasonForVisitOptions,
  hydrateIntakeDraft,
  isValidIntakeVisitType,
  normalizeCustomerConcerns,
  normalizeCustomerConcernObjects,
  restoreIntakeModalFocus,
  resolveIntakeNextRoute,
  sanitizeIntakeOdometer,
  serializeCustomerConcerns,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

const createFocusTarget = ({ isConnected = true, disabled = false, ariaDisabled = null } = {}) => {
  let focusCount = 0
  return {
    isConnected,
    disabled,
    getAttribute: (name) => (name === 'aria-disabled' ? ariaDisabled : null),
    focus: () => {
      focusCount += 1
    },
    get focusCount() {
      return focusCount
    },
  }
}

const createCompletedEligibleWalkInDraft = () => {
  const initial = createInitialIntakeDraft()
  const arrivalInspectionItems = initial.arrivalInspectionItems.map((item) => ({
    ...item,
    status: 'ok',
  }))

  return {
    ...initial,
    customerUserId: 'customer-1',
    vehicleId: 'vehicle-1',
    arrivalType: 'walk_in',
    visitType: 'regular_service',
    reasonForVisit: 'Brake concern',
    reasonForVisits: ['Brake concern', 'Noise or vibration check'],
    requestedServiceSummary: 'Brake inspection, Wheel alignment',
    requestedServiceIds: ['service-brake', 'service-alignment'],
    requestedServiceNames: ['Brake inspection', 'Wheel alignment'],
    serviceConcern: 'Brake vibration at road speed',
    currentOdometerKm: '45230',
    receivedByStaff: 'Service Adviser',
    stickerObservation: 'verified_present',
    customerAcknowledged: true,
    requirementsChecklist: {
      ...initial.requirementsChecklist,
      customerContactConfirmed: true,
      authorizationAcknowledged: true,
      keysHandoffConfirmed: true,
    },
    arrivalInspectionItems,
    checklist: Object.fromEntries(arrivalInspectionItems.map((item) => [item.key, 'ok'])),
  }
}

test('Issue modal Close restores focus to its captured trigger', () => {
  const trigger = createFocusTarget()

  assert.equal(restoreIntakeModalFocus(trigger), true)
  assert.equal(trigger.focusCount, 1)
})

test('Issue modal Escape restores focus to its captured trigger', () => {
  const trigger = createFocusTarget()

  assert.equal(restoreIntakeModalFocus(trigger), true)
  assert.equal(trigger.focusCount, 1)
})

test('modal focus restoration skips removed or disabled triggers', () => {
  const removed = createFocusTarget({ isConnected: false })
  const disabled = createFocusTarget({ disabled: true })

  assert.equal(restoreIntakeModalFocus(removed), false)
  assert.equal(restoreIntakeModalFocus(disabled), false)
  assert.equal(removed.focusCount, 0)
  assert.equal(disabled.focusCount, 0)
})

test('createInitialIntakeDraft returns the intake defaults', () => {
  assert.deepEqual(createInitialIntakeDraft(), {
    customerUserId: '',
    vehicleId: '',
    bookingId: '',
    status: 'pending',
    notes: '',
    arrivalType: 'walk_in',
    visitType: '',
    reasonForVisit: '',
    reasonForVisits: [],
    requestedServiceSummary: '',
    requestedServiceIds: [],
    requestedServiceNames: [],
    isRepeatVisit: false,
    urgencyFlag: false,
    requirementsChecklist: {
      bookingFound: false,
      orCrPresent: false,
      validIdPresent: false,
      oldPolicyPresent: false,
      supportingDocsPresent: false,
      customerContactConfirmed: false,
      authorizationAcknowledged: false,
      keysHandoffConfirmed: false,
      insuranceDocumentsPresent: false,
      backJobDocumentsPresent: false,
    },
    missingRequirementsNote: '',
    stickerObservation: '',
    stickerObservationReason: '',
    safetyAccessNotes: '',
    nextRoute: '',
    serviceConcern: '',
    customerConcerns: [],
    currentOdometerKm: '',
    fuelLevel: '1/2',
    damageAreas: [],
    damageNotes: '',
    customerItems: '',
    customerAcknowledged: false,
    customerSignatureName: '',
    receivedByStaff: '',
    paperChecklistStatus: 'not_started',
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
      batteryCondition: 'unchecked',
      engineOilLevel: 'unchecked',
      coolantLevel: 'unchecked',
      tirePressure: 'unchecked',
      allLightsFunctional: 'unchecked',
      brakePedalFeel: 'unchecked',
    },
    arrivalInspectionItems: [
      { key: 'batteryCondition', status: 'unchecked', issue: null },
      { key: 'engineOilLevel', status: 'unchecked', issue: null },
      { key: 'coolantLevel', status: 'unchecked', issue: null },
      { key: 'tirePressure', status: 'unchecked', issue: null },
      { key: 'allLightsFunctional', status: 'unchecked', issue: null },
      { key: 'brakePedalFeel', status: 'unchecked', issue: null },
    ],
  })
})

test('arrival inspection category paging preserves serialized item keys and counts', () => {
  const initial = createCompletedEligibleWalkInDraft()
  const items = initial.arrivalInspectionItems.map((item) =>
    item.key === 'batteryCondition' || item.key === 'tirePressure'
      ? { ...item, status: 'issue', issue: { location: '', severity: 'medium', notes: '' } }
      : item.key === 'engineOilLevel'
        ? { ...item, status: 'ok' }
        : item,
  )
  const progress = getArrivalInspectionCategoryProgress(items, initial.checklist)

  assert.deepEqual(progress.map((category) => category.value), arrivalInspectionCategoryOptions.map((category) => category.value))
  assert.equal(progress[0].checked, 3)
  assert.equal(progress[0].issues, 1)
  assert.equal(progress[1].checked, 3)
  assert.equal(progress[1].issues, 1)

  const payload = buildIntakeDraftPayload({ ...initial, arrivalInspectionItems: items })
  assert.deepEqual(payload.intakeData.arrivalInspectionItems, items)
})

test('checklist issue details round-trip without breaking legacy issue values', () => {
  const value = buildChecklistIssueValue({
    location: 'Front-left engine bay',
    description: 'Battery terminal is loose and shows corrosion.',
  })

  assert.equal(getChecklistStatus(value), 'issue')
  assert.deepEqual(getChecklistIssueDetails(value), {
    location: 'Front-left engine bay',
    severity: 'medium',
    description: 'Battery terminal is loose and shows corrosion.',
    evidenceSlot: '',
  })
  assert.equal(getChecklistStatus('issue'), 'issue')
  assert.deepEqual(getChecklistIssueDetails('issue'), {
    location: '',
    severity: 'medium',
    description: '',
    evidenceSlot: '',
  })
  assert.deepEqual(getChecklistIssueDetails('issue:{invalid-json'), {
    location: '',
    severity: 'medium',
    description: '',
    evidenceSlot: '',
  })
  assert.equal(getChecklistStatus('ok'), 'ok')
})

test('structured checklist issues become readable inspection findings', () => {
  const payload = buildIntakeInspectionPayload({
    draft: {
      ...createInitialIntakeDraft(),
      checklist: {
        ...createInitialIntakeDraft().checklist,
        batteryCondition: buildChecklistIssueValue({
          location: 'Battery positive terminal',
          description: 'Clamp moves when checked.',
        }),
      },
    },
    userId: 'staff-1',
  })

  assert.deepEqual(
    payload.findings.find((finding) => finding.label === 'Battery condition issue'),
    {
      category: 'mechanical',
      label: 'Battery condition issue',
      severity: 'medium',
      notes: 'Battery positive terminal - Clamp moves when checked.',
      isVerified: true,
    },
  )
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
  assert.match(payload.notes, /Customer contact confirmed: Missing/)
  assert.match(payload.notes, /Insurance documents present: Missing/)
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
  assert.match(payload.notes, /Visit type: Not provided/)
  assert.match(payload.notes, /Next route: Not provided/)
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

  assert.match(payload.notes, /Customer contact confirmed: Missing/)
  assert.match(payload.notes, /Keys \/ vehicle handoff confirmed: Missing/)
})

test('completed intake requirements keep drafts saveable but block incomplete handoff', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    customerUserId: 'customer-1',
    vehicleId: 'vehicle-1',
    arrivalType: 'with_booking',
    visitType: 'regular_service',
    reasonForVisit: 'Preventive maintenance',
    serviceConcern: 'Routine service',
    requestedServiceSummary: 'Oil change',
    currentOdometerKm: '12000',
    receivedByStaff: 'Staff Adviser',
    stickerObservation: 'verified_present',
    customerAcknowledged: true,
    requirementsChecklist: {
      ...createInitialIntakeDraft().requirementsChecklist,
      customerContactConfirmed: true,
      authorizationAcknowledged: true,
      keysHandoffConfirmed: true,
    },
    arrivalInspectionItems: createInitialIntakeDraft().arrivalInspectionItems.map((item) => ({
      ...item,
      status: 'ok',
    })),
  }

  const result = getCompletedIntakeRequirements(draft)
  assert.equal(result.ready, false)
  assert.deepEqual(result.missing, ['booking'])

  const walkInResult = getCompletedIntakeRequirements({ ...draft, arrivalType: 'walk_in' })
  assert.equal(walkInResult.ready, true)
})

test('completion blockers provide one plain-language list with stage and control mappings', () => {
  const draft = createInitialIntakeDraft()
  const blockers = getIntakeCompletionBlockers(draft)

  assert.equal(blockers.some((blocker) => blocker.key === 'customer' && blocker.control === 'customer'), true)
  assert.equal(
    blockers.some((blocker) => blocker.key === 'reasonForVisit' && blocker.tab === 'concern_requirements'),
    true,
  )
  assert.equal(blockers.some((blocker) => blocker.key === 'arrivalInspection:batteryCondition'), true)
  assert.deepEqual(
    getCompletedIntakeRequirements(draft).missing,
    [...new Set(blockers.map((blocker) => blocker.missing))],
  )
})

test('completed eligible intake blockers and serialized structured payload agree', () => {
  const draft = createCompletedEligibleWalkInDraft()
  const payload = buildIntakeDraftPayload(draft)

  assert.deepEqual(getIntakeCompletionBlockers(draft), [])
  assert.equal(getCompletedIntakeRequirements(draft).ready, true)
  assert.deepEqual(payload.intakeData.reasonForVisits, [
    'Brake concern',
    'Noise or vibration check',
  ])
  assert.deepEqual(payload.intakeData.requestedServiceIds, [
    'service-brake',
    'service-alignment',
  ])
  assert.deepEqual(payload.intakeData.requestedServiceNames, [
    'Brake inspection',
    'Wheel alignment',
  ])
  assert.deepEqual(
    payload.intakeData.arrivalInspectionItems,
    draft.arrivalInspectionItems.map(({ key }) => ({ key, status: 'ok', issue: null })),
  )
})

test('missing or null structured collections produce matching blockers and payload shapes', () => {
  const missingReasons = {
    ...createCompletedEligibleWalkInDraft(),
    reasonForVisit: null,
    reasonForVisits: null,
  }
  const reasonPayload = buildIntakeDraftPayload(missingReasons)
  assert.equal(getIntakeCompletionBlockers(missingReasons).some(({ key }) => key === 'reasonForVisit'), true)
  assert.equal(reasonPayload.intakeData.reasonForVisits, undefined)
  assert.equal(reasonPayload.intakeData.reasonForVisit, undefined)

  const missingServices = {
    ...createCompletedEligibleWalkInDraft(),
    requestedServiceSummary: null,
    requestedServiceIds: null,
    requestedServiceNames: null,
  }
  const servicePayload = buildIntakeDraftPayload(missingServices)
  assert.equal(getIntakeCompletionBlockers(missingServices).some(({ key }) => key === 'requestedServices'), true)
  assert.equal(servicePayload.intakeData.requestedServiceIds, undefined)
  assert.equal(servicePayload.intakeData.requestedServiceNames, undefined)
  assert.equal(servicePayload.intakeData.requestedServiceSummary, undefined)

  const missingArrivalItems = {
    ...createCompletedEligibleWalkInDraft(),
    arrivalInspectionItems: null,
    checklist: {},
  }
  const arrivalPayload = buildIntakeDraftPayload(missingArrivalItems)
  assert.equal(
    getIntakeCompletionBlockers(missingArrivalItems).filter(({ key }) =>
      key.startsWith('arrivalInspection:'),
    ).length,
    6,
  )
  assert.deepEqual(
    arrivalPayload.intakeData.arrivalInspectionItems,
    createInitialIntakeDraft().arrivalInspectionItems,
  )
})

test('arrival inspection progress counts explicit OK and Issue states', () => {
  const draft = createInitialIntakeDraft()
  const progress = getArrivalInspectionProgress(
    draft.arrivalInspectionItems.map((item, index) => ({
      ...item,
      status: index < 4 ? 'ok' : index === 4 ? 'issue' : 'unchecked',
      issue: index === 4 ? { location: 'hood', severity: 'low', notes: 'Small mark.' } : null,
    })),
  )

  assert.deepEqual(progress, { checked: 5, total: 6, issues: 1, complete: false })
})

test('eligible intake bookings contain only confirmed and in-service records', () => {
  const bookings = getEligibleIntakeBookings([
    { id: 'pending', status: 'pending', scheduledDate: '2026-08-09' },
    { id: 'confirmed', status: 'confirmed', scheduledDate: '2026-08-08' },
    { id: 'in-service', status: 'in_service', scheduledDate: '2026-08-10' },
    { id: 'completed', status: 'completed', scheduledDate: '2026-08-11' },
  ])

  assert.deepEqual(bookings.map((booking) => booking.id), ['in-service', 'confirmed'])
})

test('booking query hydration distinguishes exact, stale, and ineligible links', () => {
  assert.equal(
    getBookingQueryHydrationState({
      bookingId: 'booking-1',
      booking: { id: 'booking-1', status: 'confirmed' },
    }).status,
    'ready',
  )
  assert.equal(
    getBookingQueryHydrationState({
      bookingId: 'booking-2',
      booking: { id: 'booking-2', status: 'cancelled', bookingReference: 'BK-2' },
    }).status,
    'ineligible',
  )
  assert.equal(
    getBookingQueryHydrationState({ bookingId: 'missing', error: { status: 404 } }).status,
    'stale',
  )
})

test('booking prefill preserves exact reasons and requested service records', () => {
  assert.deepEqual(
    getBookingIntakePrefill({
      reasonForVisits: ['Brake concern', 'Noise or vibration check'],
      requestedServices: [
        { service: { id: 'svc-brake', name: 'Brake inspection' } },
        { service: { id: 'svc-pms', name: 'Preventive maintenance' } },
      ],
    }),
    {
      visitType: '',
      reasonForVisits: ['Brake concern', 'Noise or vibration check'],
      requestedServiceIds: ['svc-brake', 'svc-pms'],
      requestedServiceNames: ['Brake inspection', 'Preventive maintenance'],
      requestedServiceSummary: 'Brake inspection, Preventive maintenance',
      customerConcerns: [],
      serviceConcern: '',
    },
  )
})

test('new Intake requires an explicit visit type and omits it from draft transport until selected', () => {
  const draft = createInitialIntakeDraft()
  assert.equal(draft.visitType, '')
  assert.equal(resolveIntakeNextRoute(draft.visitType, draft.nextRoute), '')
  assert.equal(buildIntakeDraftPayload(draft).intakeData.visitType, undefined)
  assert.ok(getIntakeCompletionBlockers(draft).some((blocker) => blocker.key === 'visitType'))
})

test('Visit Type readiness accepts only explicit supported values and resets when cleared', () => {
  assert.equal(isValidIntakeVisitType(''), false)
  assert.equal(isValidIntakeVisitType('regular_service'), true)
  assert.equal(isValidIntakeVisitType('insurance_related'), true)
  assert.equal(isValidIntakeVisitType('legacy_default'), false)
  assert.equal(isValidIntakeVisitType(null), false)
})

test('multiple customer concerns map deterministically to the legacy serviceConcern field', () => {
  const concerns = [
    { id: 'concern-brake', text: 'Brake vibration' },
    { id: 'concern-noise', text: 'Noise over bumps' },
  ]
  assert.deepEqual(normalizeCustomerConcerns(concerns), ['Brake vibration', 'Noise over bumps'])
  assert.deepEqual(normalizeCustomerConcernObjects(concerns), concerns)
  assert.equal(serializeCustomerConcerns(concerns), 'Brake vibration • Noise over bumps')
  const payload = buildIntakeDraftPayload({ ...createInitialIntakeDraft(), customerConcerns: concerns })
  assert.equal(payload.intakeData.serviceConcern, 'Brake vibration • Noise over bumps')
  assert.deepEqual(hydrateIntakeDraft({ intakeData: payload.intakeData }).customerConcerns, concerns)
})

test('legacy serviceConcern reloads as one concern without splitting its text', () => {
  assert.deepEqual(
    hydrateIntakeDraft({ intakeData: { serviceConcern: 'Noise; vibration • intermittent' } }).customerConcerns,
    [{ id: 'concern-1', text: 'Noise; vibration • intermittent' }],
  )
})

test('walk-in draft payload keeps multi-selects and structured issue evidence', () => {
  const draft = createInitialIntakeDraft()
  const payload = buildIntakeDraftPayload({
    ...draft,
    reasonForVisits: ['Brake concern', 'Noise or vibration check'],
    requestedServiceIds: ['svc-brake'],
    requestedServiceNames: ['Brake inspection'],
    arrivalInspectionItems: draft.arrivalInspectionItems.map((item) =>
      item.key === 'brakePedalFeel'
        ? {
            ...item,
            status: 'issue',
            issue: {
              location: 'Front pedal',
              severity: 'high',
              notes: 'Soft pedal feel.',
              evidenceSlot: 'issue-brakePedalFeel',
            },
          }
        : { ...item, status: 'ok' },
    ),
  })

  assert.deepEqual(payload.intakeData.reasonForVisits, ['Brake concern', 'Noise or vibration check'])
  assert.deepEqual(payload.intakeData.requestedServiceIds, ['svc-brake'])
  assert.equal(payload.intakeData.arrivalInspectionItems.find((item) => item.key === 'brakePedalFeel').issue.severity, 'high')
  assert.equal(payload.intakeData.arrivalInspectionItems.find((item) => item.key === 'brakePedalFeel').issue.evidenceSlot, 'issue-brakePedalFeel')
  assert.equal(payload.intakeData.arrivalInspectionItems.find((item) => item.key === 'brakePedalFeel').issue.description, undefined)
  assert.equal(payload.intakeData.arrivalInspectionItems.find((item) => item.key === 'brakePedalFeel').issue.notes, 'Soft pedal feel.')
})

test('planned draft payload and hydration preserve structured intake data', () => {
  const draft = {
    ...createInitialIntakeDraft(),
    bookingId: 'booking-3',
    vehicleId: 'vehicle-3',
    currentOdometerKm: '45,230 km',
    serviceConcern: 'Brake vibration',
    paperChecklistStatus: 'reviewed',
    arrivalInspectionItems: createInitialIntakeDraft().arrivalInspectionItems.map((item) =>
      item.key === 'brakePedalFeel'
        ? {
            ...item,
            status: 'issue',
            issue: {
              location: 'Brake pedal',
              severity: 'high',
              notes: 'Pedal feels soft.',
              evidenceSlot: '',
            },
          }
        : { ...item, status: 'ok' },
    ),
    checklist: {
      ...createInitialIntakeDraft().checklist,
      brakePedalFeel: buildChecklistIssueValue({
        location: 'Brake pedal',
        severity: 'high',
        description: 'Pedal feels soft.',
      }),
    },
  }
  const payload = buildIntakeDraftPayload(draft)

  assert.equal(payload.bookingId, 'booking-3')
  assert.equal(payload.intakeData.currentOdometerKm, 45230)
  assert.equal(payload.intakeData.paperChecklistStatus, 'reviewed')
  assert.equal(payload.intakeData.preServiceChecklist.brakePedalFeel.startsWith('issue:'), true)

  const hydrated = hydrateIntakeDraft(
    {
      id: 'inspection-3',
      status: 'pending',
      bookingId: 'booking-3',
      vehicleId: 'vehicle-3',
      intakeData: payload.intakeData,
    },
    { customerUserId: 'customer-3' },
  )
  assert.equal(hydrated.customerUserId, 'customer-3')
  assert.equal(hydrated.currentOdometerKm, 45230)
  assert.equal(hydrated.paperChecklistStatus, 'reviewed')
  assert.equal(hydrated.arrivalInspectionItems.find((item) => item.key === 'brakePedalFeel').status, 'issue')
  assert.equal(hydrated.checklist.brakePedalFeel.startsWith('issue:'), true)
})

test('completion receipts point each intake type at its own destination', () => {
  const regular = buildIntakeCompletionReceipt({
    draft: { visitType: 'regular_service' },
    result: { inspection: { id: 'inspection-1', version: 2 }, jobOrderId: 'job-1' },
  })
  const insurance = buildIntakeCompletionReceipt({
    draft: { visitType: 'insurance_related' },
    result: { id: 'inspection-2', inspectionReference: 'INSP-2' },
  })

  assert.equal(regular.destination, 'Workshop')
  assert.equal(regular.path, '/admin/job-orders/job-1')
  assert.equal(insurance.destination, 'Insurance')
  assert.equal(insurance.path, '/insurance')
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
  assert.match(payload.notes, /ARRIVAL INSPECTION/)
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
      { value: 'customerContactConfirmed', required: true },
      { value: 'authorizationAcknowledged', required: true },
      { value: 'keysHandoffConfirmed', required: true },
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
      { value: 'customerContactConfirmed', required: true },
      { value: 'authorizationAcknowledged', required: true },
      { value: 'keysHandoffConfirmed', required: true },
      { value: 'insuranceDocumentsPresent', required: true },
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
