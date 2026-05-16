const checklistLabels = {
  batteryCondition: 'Battery condition',
  engineOilLevel: 'Engine oil level',
  coolantLevel: 'Coolant level',
  tirePressure: 'Tire pressure',
  allLightsFunctional: 'All lights functional',
  brakePedalFeel: 'Brake pedal feel',
}

const damageAreaLabels = {
  front_bumper: 'Front bumper',
  rear_bumper_trunk: 'Rear bumper / trunk',
  roof_windshield: 'Roof / windshield',
  hood_front: 'Hood / front',
  left_side_panels: 'Left side panels',
  right_side_panels: 'Right side panels',
  undercarriage: 'Undercarriage',
}

const arrivalPhotoLabels = {
  front: 'Front view',
  rear: 'Rear view',
  leftSide: 'Left side',
  rightSide: 'Right side',
  dashboardOdometer: 'Dashboard / odometer',
  interior: 'Interior',
  damageCloseup: 'Damage close-up',
  additional: 'Additional reference',
}

const maxNotesLength = 1000
const truncationMarker = '...'
const defaultArrivalType = 'walk_in'
const defaultVisitType = 'regular_service'
const defaultNextRoute = 'service'

const allowedArrivalTypes = new Set(['walk_in', 'with_booking'])
const allowedVisitTypes = new Set([
  'regular_service',
  'insurance_related',
  'back_job_complaint',
  'inspection_only',
])
const allowedNextRoutes = new Set(['service', 'insurance', 'complaint', 'inspection'])
const nextRouteByVisitType = Object.freeze({
  regular_service: 'service',
  insurance_related: 'insurance',
  back_job_complaint: 'complaint',
  inspection_only: 'inspection',
})
const requirementOptionCatalog = Object.freeze({
  bookingFound: {
    value: 'bookingFound',
    label: 'Booking confirmed',
    helper: 'Optional for walk-ins, expected for scheduled arrivals.',
  },
  orCrPresent: {
    value: 'orCrPresent',
    label: 'OR/CR present',
    helper: 'Confirm the vehicle papers are available at intake.',
  },
  validIdPresent: {
    value: 'validIdPresent',
    label: 'Valid ID present',
    helper: 'Useful when the visit needs insurance-related identity checks.',
  },
  oldPolicyPresent: {
    value: 'oldPolicyPresent',
    label: 'Old policy present',
    helper: 'Carry forward the latest policy when routing into insurance.',
  },
  supportingDocsPresent: {
    value: 'supportingDocsPresent',
    label: 'Supporting docs present',
    helper: 'Claim photos, affidavits, or other insurance references.',
  },
})
const requirementFieldsByVisitType = Object.freeze({
  regular_service: ['bookingFound', 'orCrPresent'],
  insurance_related: ['bookingFound', 'orCrPresent', 'validIdPresent', 'oldPolicyPresent', 'supportingDocsPresent'],
  back_job_complaint: ['bookingFound', 'orCrPresent', 'supportingDocsPresent'],
  inspection_only: ['bookingFound', 'orCrPresent'],
})

export const intakeFieldMaxLengths = Object.freeze({
  arrivalType: 24,
  visitType: 32,
  reasonForVisit: 240,
  requestedServiceSummary: 240,
  currentOdometerKm: 20,
  fuelLevel: 20,
  serviceConcern: 120,
  missingRequirementsNote: 240,
  nextRoute: 24,
  damageNotes: 90,
  customerItems: 90,
  customerSignatureName: 48,
  receivedByStaff: 48,
  notes: 120,
})

const normalizeAttachmentRefs = (arrivalPhotos) =>
  [...new Set(
    Object.values(arrivalPhotos ?? {})
      .map((ref) => String(ref ?? '').trim())
      .filter(Boolean),
  )]

const truncateText = (value, maxLength) => {
  const text = String(value ?? '').trim()
  if (!text || text.length <= maxLength) {
    return text
  }
  if (maxLength <= truncationMarker.length) {
    return text.slice(0, maxLength)
  }

  return `${text.slice(0, maxLength - truncationMarker.length).trimEnd()}${truncationMarker}`
}

const normalizeControlValue = (value, allowedValues, fallbackValue) => {
  const normalizedValue = String(value ?? '').trim()
  return allowedValues.has(normalizedValue) ? normalizedValue : fallbackValue
}

export const resolveIntakeNextRoute = (visitType, nextRoute) => {
  const normalizedVisitType = normalizeControlValue(
    visitType,
    allowedVisitTypes,
    defaultVisitType,
  )
  const visitTypeRoute = nextRouteByVisitType[normalizedVisitType] ?? defaultNextRoute
  const normalizedNextRoute = normalizeControlValue(nextRoute, allowedNextRoutes, visitTypeRoute)

  return normalizedNextRoute === visitTypeRoute ? normalizedNextRoute : visitTypeRoute
}

export const getIntakeRequirementOptions = ({ arrivalType, visitType }) => {
  const normalizedArrivalType = normalizeControlValue(
    arrivalType,
    allowedArrivalTypes,
    defaultArrivalType,
  )
  const normalizedVisitType = normalizeControlValue(
    visitType,
    allowedVisitTypes,
    defaultVisitType,
  )

  return (requirementFieldsByVisitType[normalizedVisitType] ?? requirementFieldsByVisitType[defaultVisitType]).map(
    (field) => ({
      ...requirementOptionCatalog[field],
      required: field === 'bookingFound' ? normalizedArrivalType === 'with_booking' : true,
    }),
  )
}

const buildNormalizedRequirementsChecklist = (requirementsChecklist) => ({
  bookingFound: Boolean(requirementsChecklist?.bookingFound),
  orCrPresent: Boolean(requirementsChecklist?.orCrPresent),
  validIdPresent: Boolean(requirementsChecklist?.validIdPresent),
  oldPolicyPresent: Boolean(requirementsChecklist?.oldPolicyPresent),
  supportingDocsPresent: Boolean(requirementsChecklist?.supportingDocsPresent),
})

const buildCappedIntakeDraft = (draft) => {
  const visitType = normalizeControlValue(
    draft.visitType,
    allowedVisitTypes,
    defaultVisitType,
  )

  return {
    ...draft,
    arrivalType: normalizeControlValue(
      draft.arrivalType,
      allowedArrivalTypes,
      defaultArrivalType,
    ),
    visitType,
    reasonForVisit: truncateText(draft.reasonForVisit, intakeFieldMaxLengths.reasonForVisit),
    requestedServiceSummary: truncateText(
      draft.requestedServiceSummary,
      intakeFieldMaxLengths.requestedServiceSummary,
    ),
    currentOdometerKm: truncateText(draft.currentOdometerKm, intakeFieldMaxLengths.currentOdometerKm),
    fuelLevel: truncateText(draft.fuelLevel, intakeFieldMaxLengths.fuelLevel),
    serviceConcern: truncateText(draft.serviceConcern, intakeFieldMaxLengths.serviceConcern),
    missingRequirementsNote: truncateText(
      draft.missingRequirementsNote,
      intakeFieldMaxLengths.missingRequirementsNote,
    ),
    requirementsChecklist: buildNormalizedRequirementsChecklist(draft.requirementsChecklist),
    nextRoute: resolveIntakeNextRoute(visitType, draft.nextRoute),
    damageNotes: truncateText(draft.damageNotes, intakeFieldMaxLengths.damageNotes),
    customerItems: truncateText(draft.customerItems, intakeFieldMaxLengths.customerItems),
    customerSignatureName: truncateText(
      draft.customerSignatureName,
      intakeFieldMaxLengths.customerSignatureName,
    ),
    receivedByStaff: truncateText(draft.receivedByStaff, intakeFieldMaxLengths.receivedByStaff),
    notes: truncateText(draft.notes, intakeFieldMaxLengths.notes),
  }
}

const appendWithinNoteBudget = (baseNotes, extraNotes) => {
  if (!extraNotes) {
    return baseNotes
  }

  const separator = '\n\n'
  const remaining = maxNotesLength - baseNotes.length - separator.length

  if (remaining <= 0) {
    return baseNotes
  }

  return `${baseNotes}${separator}${truncateText(extraNotes, remaining)}`
}

export const fuelLevelOptions = ['Empty', '1/4', '1/2', '3/4', 'Full']

export const damageAreaOptions = Object.entries(damageAreaLabels).map(([value, label]) => ({
  value,
  label,
}))

export const arrivalPhotoSlots = Object.entries(arrivalPhotoLabels).map(([value, label]) => ({
  value,
  label,
}))

export const checklistItemOptions = Object.entries(checklistLabels).map(([value, label]) => ({
  value,
  label,
}))

export const createInitialIntakeDraft = () => ({
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
  status: 'pending',
  notes: '',
  arrivalType: defaultArrivalType,
  visitType: defaultVisitType,
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
  nextRoute: defaultNextRoute,
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

export const buildIntakeInspectionNotes = (draft) => {
  const cappedDraft = buildCappedIntakeDraft(draft)

  const damageAreas = cappedDraft.damageAreas
    .map((area) => damageAreaLabels[area] || area)
    .join(', ')

  const checklistNotes = Object.entries(cappedDraft.checklist)
    .map(([key, value]) => `${checklistLabels[key] || key}: ${value === 'issue' ? 'Issue' : 'OK'}`)
    .join('\n')

  return [
    'SERVICE CONCERN',
    cappedDraft.serviceConcern || 'Not provided',
    '',
    'INTAKE DETAILS',
    `Current odometer (km): ${cappedDraft.currentOdometerKm || 'Not provided'}`,
    `Fuel level on arrival: ${cappedDraft.fuelLevel || 'Not provided'}`,
    `Damage areas: ${damageAreas || 'None marked'}`,
    `Damage notes: ${cappedDraft.damageNotes || 'None'}`,
    '',
    'PRE-SERVICE CHECKLIST',
    checklistNotes,
    '',
    'CUSTOMER ITEMS',
    cappedDraft.customerItems || 'None noted',
    '',
    'CUSTOMER ACKNOWLEDGMENT',
    `Acknowledged: ${cappedDraft.customerAcknowledged ? 'Yes' : 'No'}`,
    `Customer signature: ${cappedDraft.customerSignatureName || 'Not captured'}`,
    `Received by staff: ${cappedDraft.receivedByStaff || 'Not assigned'}`,
  ].join('\n')
}

export const buildIntakeInspectionPayload = ({ draft, userId }) => {
  const cappedDraft = buildCappedIntakeDraft(draft)
  const attachmentRefs = normalizeAttachmentRefs(cappedDraft.arrivalPhotos)
  const damageLabels = cappedDraft.damageAreas.map((area) => damageAreaLabels[area] || area)
  const damageNotes = [damageLabels.join(', '), cappedDraft.damageNotes.trim()].filter(Boolean).join(' | ')
  const findings = damageLabels.length || cappedDraft.damageNotes.trim()
    ? [
        {
          category: 'body',
          label: 'Existing damage marked',
          severity: 'medium',
          notes: damageNotes,
          isVerified: true,
        },
      ]
    : []

  const notes = appendWithinNoteBudget(
    buildIntakeInspectionNotes(cappedDraft),
    cappedDraft.notes,
  )

  return {
    inspectionType: 'intake',
    status: cappedDraft.status || 'completed',
    bookingId: cappedDraft.bookingId.trim() || undefined,
    inspectorUserId: userId,
    arrivalType: cappedDraft.arrivalType,
    visitType: cappedDraft.visitType,
    reasonForVisit: cappedDraft.reasonForVisit,
    requestedServiceSummary: cappedDraft.requestedServiceSummary,
    isRepeatVisit: Boolean(cappedDraft.isRepeatVisit),
    urgencyFlag: Boolean(cappedDraft.urgencyFlag),
    requirementsChecklist: buildNormalizedRequirementsChecklist(cappedDraft.requirementsChecklist),
    missingRequirementsNote: cappedDraft.missingRequirementsNote,
    nextRoute: cappedDraft.nextRoute,
    notes,
    attachmentRefs,
    findings,
  }
}
