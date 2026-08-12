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
const defaultVisitType = ''
const defaultNextRoute = ''
const formatLabel = (value) =>
  String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())

const allowedArrivalTypes = new Set(['walk_in', 'with_booking'])
const allowedVisitTypes = new Set([
  'regular_service',
  'insurance_related',
  'back_job_complaint',
  'inspection_only',
])
const allowedNextRoutes = new Set(['service', 'insurance', 'complaint', 'inspection'])
const allowedPaperChecklistStatuses = new Set([
  'not_started',
  'in_progress',
  'transcribed',
  'reviewed',
])
const nextRouteByVisitType = Object.freeze({
  regular_service: 'service',
  insurance_related: 'insurance',
  back_job_complaint: 'complaint',
  inspection_only: 'inspection',
})

const requiredCompletedIntakeFields = Object.freeze([
  ['customerUserId', 'customer'],
  ['vehicleId', 'vehicle'],
  ['visitType', 'visit type'],
  ['serviceConcern', 'service concern'],
  ['currentOdometerKm', 'odometer'],
  ['receivedByStaff', 'receiving staff'],
])

export const isValidIntakeVisitType = (value) =>
  allowedVisitTypes.has(String(value ?? '').trim())
const reasonForVisitOptionCatalog = Object.freeze({
  regular_service: [
    'Preventive maintenance',
    'Oil change / PMS',
    'Brake concern',
    'Engine or drivetrain concern',
    'Aircon or electrical concern',
    'Tire or wheel concern',
    'Noise or vibration check',
  ],
  insurance_related: [
    'Accident damage inspection',
    'Insurance estimate or claim support',
    'Policy renewal support',
    'Document completion',
    'Claim follow-up',
  ],
  back_job_complaint: [
    'Return visit for unresolved issue',
    'Follow-up on prior repair',
    'Recheck after recent service',
    'Warranty or back-job evaluation',
  ],
  inspection_only: [
    'General inspection',
    'Pre-purchase inspection',
    'Roadworthy or safety inspection',
    'Insurance documentation inspection',
    'Diagnostic inspection',
  ],
})
const requirementOptionCatalog = Object.freeze({
  bookingFound: {
    value: 'bookingFound',
    label: 'Booking confirmed',
    helper: 'Optional for walk-ins, expected for scheduled arrivals.',
  },
  customerContactConfirmed: {
    value: 'customerContactConfirmed',
    label: 'Customer contact confirmed',
    helper: 'Confirm the best contact for updates and approvals.',
  },
  authorizationAcknowledged: {
    value: 'authorizationAcknowledged',
    label: 'Authorization acknowledged',
    helper: 'Record that the arrival summary and requested work were acknowledged.',
  },
  keysHandoffConfirmed: {
    value: 'keysHandoffConfirmed',
    label: 'Keys / vehicle handoff confirmed',
    helper: 'Confirm keys or the agreed vehicle handoff is accounted for.',
  },
  insuranceDocumentsPresent: {
    value: 'insuranceDocumentsPresent',
    label: 'Insurance documents present',
    helper: 'Only needed when this visit is routed through insurance.',
  },
  backJobDocumentsPresent: {
    value: 'backJobDocumentsPresent',
    label: 'Back-job reference present',
    helper: 'Only needed when this is a return visit or complaint.',
  },
})
const requirementFieldsByVisitType = Object.freeze({
  regular_service: ['customerContactConfirmed', 'authorizationAcknowledged', 'keysHandoffConfirmed'],
  insurance_related: [
    'customerContactConfirmed',
    'authorizationAcknowledged',
    'keysHandoffConfirmed',
    'insuranceDocumentsPresent',
  ],
  back_job_complaint: [
    'customerContactConfirmed',
    'authorizationAcknowledged',
    'keysHandoffConfirmed',
    'backJobDocumentsPresent',
  ],
  inspection_only: ['customerContactConfirmed', 'authorizationAcknowledged', 'keysHandoffConfirmed'],
})

export const intakeFieldMaxLengths = Object.freeze({
  arrivalType: 24,
  visitType: 32,
  reasonForVisit: 240,
  requestedServiceSummary: 240,
  currentOdometerKm: 20,
  fuelLevel: 20,
  serviceConcern: 120,
  customerConcernText: 500,
  missingRequirementsNote: 240,
  stickerObservationReason: 240,
  nextRoute: 24,
  damageNotes: 90,
  customerItems: 90,
  customerSignatureName: 48,
  receivedByStaff: 48,
  notes: 120,
  safetyAccessNotes: 500,
})

const normalizeAttachmentRefs = (arrivalPhotos) =>
  [...new Set(
    Object.values(arrivalPhotos ?? {})
      .map((ref) => String(ref ?? '').trim())
    .filter(Boolean),
)]

const normalizeStringArray = (value, maxLength = 160) =>
  [...new Set(
    (Array.isArray(value) ? value : [value])
      .map((item) => truncateText(item, maxLength))
      .filter(Boolean),
  )]

export const normalizeCustomerConcernObjects = (value) => {
  const source = Array.isArray(value) ? value : value ? [{ text: String(value) }] : []
  return source
    .map((concern, index) => ({
      id: String(typeof concern === 'object' ? concern?.id ?? '' : '').trim() || `concern-${index + 1}`,
      text: String(typeof concern === 'object' ? concern?.text ?? '' : concern).trim(),
    }))
    .filter((concern) => concern.text)
    .slice(0, 10)
}

export const normalizeCustomerConcerns = (value) =>
  normalizeCustomerConcernObjects(value).map((concern) => concern.text)

export const serializeCustomerConcerns = (value) =>
  truncateText(normalizeCustomerConcerns(value).join(' • '), intakeFieldMaxLengths.serviceConcern)

const getServiceId = (service) => String(service?.id ?? service?.serviceId ?? '').trim()

const getServiceLabel = (service) =>
  String(service?.name ?? service?.serviceName ?? service?.label ?? '').trim()

const getBookingRequestedServices = (booking) =>
  (Array.isArray(booking?.requestedServices) ? booking.requestedServices : [])
    .map((requestedService) => requestedService?.service ?? requestedService)
    .map((service) => ({
      id: getServiceId(service),
      name: getServiceLabel(service),
    }))
    .filter((service) => service.id || service.name)

export const getBookingIntakePrefill = (booking) => {
  const requestedServices = getBookingRequestedServices(booking)
  const reasonForVisits = normalizeStringArray(
    booking?.reasonForVisits ?? booking?.reasonForVisit ?? booking?.visitReason,
    240,
  )
  const requestedServiceNames = normalizeStringArray(
    requestedServices.map((service) => service.name),
    160,
  )
  const requestedServiceIds = normalizeStringArray(
    requestedServices.map((service) => service.id),
    80,
  )
  const fallbackReason = String(booking?.serviceConcern ?? '').trim()
  const visitType = normalizeControlValue(
    booking?.visitType ?? booking?.intakeVisitType,
    allowedVisitTypes,
    '',
  )
  const serviceConcern = String(booking?.serviceConcern ?? booking?.notes ?? '').trim()

  return {
    visitType,
    reasonForVisits: reasonForVisits.length ? reasonForVisits : fallbackReason ? [fallbackReason] : [],
    requestedServiceIds,
    requestedServiceNames,
    requestedServiceSummary: requestedServiceNames.join(', '),
    customerConcerns: normalizeCustomerConcernObjects(serviceConcern),
    serviceConcern,
  }
}

const defaultChecklistKeys = Object.keys(checklistLabels)

const buildDefaultArrivalInspectionItems = () =>
  defaultChecklistKeys.map((key) => ({ key, status: 'unchecked', issue: null }))

const getLegacyChecklistValue = (item) => {
  if (item?.status !== 'issue') return item?.status === 'ok' ? 'ok' : 'unchecked'
  return buildChecklistIssueValue({
    ...(item.issue ?? {}),
    description: item.issue?.description ?? item.issue?.notes,
  })
}

const normalizeArrivalInspectionItems = (items, legacyChecklist = {}) => {
  const itemByKey = new Map(
    (Array.isArray(items) ? items : []).map((item) => [String(item?.key ?? '').trim(), item]),
  )

  return defaultChecklistKeys.map((key) => {
    const item = itemByKey.get(key)
    const legacyValue = legacyChecklist?.[key]
    const legacyStatus = getChecklistStatus(legacyValue)
    if (item && item.status === 'unchecked' && legacyStatus !== 'unchecked') {
      return {
        key,
        status: legacyStatus,
        issue: legacyStatus === 'issue' ? normalizeStructuredChecklistIssue(legacyValue) : null,
      }
    }
    if (item) {
      const status = ['unchecked', 'ok', 'issue'].includes(item.status) ? item.status : 'unchecked'
      return {
        key,
        status,
        issue: status === 'issue' ? normalizeStructuredChecklistIssue(item.issue) : null,
      }
    }

    return {
      key,
      status: legacyStatus,
      issue: legacyStatus === 'issue' ? normalizeStructuredChecklistIssue(legacyValue) : null,
    }
  })
}

export const sanitizeIntakeOdometer = (value) =>
  String(value ?? '')
    .replace(/[^\d]/g, '')
    .slice(0, intakeFieldMaxLengths.currentOdometerKm)

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
  if (!normalizedVisitType) return ''
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

  return (requirementFieldsByVisitType[normalizedVisitType] ?? requirementFieldsByVisitType.regular_service).map(
    (field) => ({
      ...requirementOptionCatalog[field],
      required: field === 'bookingFound' ? normalizedArrivalType === 'with_booking' : true,
    }),
  )
}

export const getReasonForVisitOptions = ({ visitType, currentValue } = {}) => {
  const normalizedVisitType = normalizeControlValue(
    visitType,
    allowedVisitTypes,
    defaultVisitType,
  )
  const normalizedCurrentValue = String(currentValue ?? '').trim()
  const options = [...(reasonForVisitOptionCatalog[normalizedVisitType] ?? [])]

  if (normalizedCurrentValue && !options.includes(normalizedCurrentValue)) {
    options.unshift(normalizedCurrentValue)
  }

  return options
}

const buildNormalizedRequirementsChecklist = (requirementsChecklist) => ({
  customerContactConfirmed: Boolean(requirementsChecklist?.customerContactConfirmed),
  authorizationAcknowledged: Boolean(requirementsChecklist?.authorizationAcknowledged),
  keysHandoffConfirmed: Boolean(requirementsChecklist?.keysHandoffConfirmed),
  insuranceDocumentsPresent: Boolean(requirementsChecklist?.insuranceDocumentsPresent),
  backJobDocumentsPresent: Boolean(requirementsChecklist?.backJobDocumentsPresent),
})

const buildCappedIntakeDraft = (draft) => {
  const visitType = normalizeControlValue(
    draft.visitType,
    allowedVisitTypes,
    defaultVisitType,
  )

  const reasonForVisits = normalizeStringArray(
    draft.reasonForVisits?.length ? draft.reasonForVisits : draft.reasonForVisit,
    intakeFieldMaxLengths.reasonForVisit,
  )
  const requestedServiceIds = normalizeStringArray(draft.requestedServiceIds, 80)
  const requestedServiceNames = normalizeStringArray(draft.requestedServiceNames, 160)
  const legacyServiceSummary = truncateText(
    draft.requestedServiceSummary,
    intakeFieldMaxLengths.requestedServiceSummary,
  )
  const arrivalInspectionItems = normalizeArrivalInspectionItems(
    draft.arrivalInspectionItems,
    draft.checklist,
  )
  const customerConcerns = normalizeCustomerConcernObjects(
    draft.customerConcerns?.length ? draft.customerConcerns : draft.serviceConcern,
  )

  return {
    ...draft,
    arrivalType: normalizeControlValue(
      draft.arrivalType,
      allowedArrivalTypes,
      defaultArrivalType,
    ),
    visitType,
    reasonForVisits,
    reasonForVisit: reasonForVisits[0] || truncateText(draft.reasonForVisit, intakeFieldMaxLengths.reasonForVisit),
    requestedServiceIds,
    requestedServiceNames,
    requestedServiceSummary:
      truncateText(requestedServiceNames.join(', '), intakeFieldMaxLengths.requestedServiceSummary) ||
      legacyServiceSummary,
    customerConcerns,
    currentOdometerKm: sanitizeIntakeOdometer(draft.currentOdometerKm),
    fuelLevel: truncateText(draft.fuelLevel, intakeFieldMaxLengths.fuelLevel),
    serviceConcern: serializeCustomerConcerns(customerConcerns),
    missingRequirementsNote: truncateText(
      draft.missingRequirementsNote,
      intakeFieldMaxLengths.missingRequirementsNote,
    ),
    safetyAccessNotes: truncateText(draft.safetyAccessNotes, intakeFieldMaxLengths.safetyAccessNotes),
    requirementsChecklist: buildNormalizedRequirementsChecklist(draft.requirementsChecklist),
    arrivalInspectionItems,
    checklist: Object.fromEntries(
      arrivalInspectionItems.map((item) => [item.key, getLegacyChecklistValue(item)]),
    ),
    nextRoute: resolveIntakeNextRoute(visitType, draft.nextRoute),
    damageNotes: truncateText(draft.damageNotes, intakeFieldMaxLengths.damageNotes),
    customerItems: truncateText(draft.customerItems, intakeFieldMaxLengths.customerItems),
    customerSignatureName: truncateText(
      draft.customerSignatureName,
      intakeFieldMaxLengths.customerSignatureName,
    ),
    receivedByStaff: truncateText(draft.receivedByStaff, intakeFieldMaxLengths.receivedByStaff),
    paperChecklistStatus: normalizeControlValue(
      draft.paperChecklistStatus,
      allowedPaperChecklistStatuses,
      'not_started',
    ),
    notes: truncateText(draft.notes, intakeFieldMaxLengths.notes),
  }
}

const appendWithinNoteBudget = (baseNotes, extraNotes) => {
  const normalizedBaseNotes = truncateText(baseNotes, maxNotesLength)

  if (!extraNotes) {
    return normalizedBaseNotes
  }

  const separator = '\n\n'
  const remaining = maxNotesLength - normalizedBaseNotes.length - separator.length

  if (remaining <= 0) {
    return normalizedBaseNotes
  }

  return `${normalizedBaseNotes}${separator}${truncateText(extraNotes, remaining)}`
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

export const arrivalInspectionCategoryOptions = Object.freeze([
  {
    value: 'fluids_power',
    label: 'Fluids & power',
    itemValues: ['batteryCondition', 'engineOilLevel', 'coolantLevel'],
  },
  {
    value: 'roadworthiness',
    label: 'Roadworthiness',
    itemValues: ['tirePressure', 'allLightsFunctional', 'brakePedalFeel'],
  },
])
const checklistIssuePrefix = 'issue:'

export const getChecklistStatus = (value) => {
  if (value && typeof value === 'object') {
    return ['unchecked', 'ok', 'issue'].includes(value.status) ? value.status : 'unchecked'
  }
  if (String(value ?? '').startsWith(checklistIssuePrefix) || value === 'issue') return 'issue'
  if (value === 'ok') return 'ok'
  return 'unchecked'
}

export const getChecklistIssueDetails = (value) => {
  if (value && typeof value === 'object') {
    const issue = value.issue ?? value
    return {
      location: truncateText(issue?.location, 160),
      severity: ['low', 'medium', 'high'].includes(issue?.severity) ? issue.severity : 'medium',
      description: truncateText(issue?.description ?? issue?.notes, 500),
      evidenceSlot: truncateText(issue?.evidenceSlot, 80),
    }
  }

  const normalized = String(value ?? '')
  if (!normalized.startsWith(checklistIssuePrefix)) {
    return { location: '', severity: 'medium', description: '', evidenceSlot: '' }
  }

  try {
    const parsed = JSON.parse(normalized.slice(checklistIssuePrefix.length))
    return {
      location: truncateText(parsed?.location, 160),
      severity: ['low', 'medium', 'high'].includes(parsed?.severity) ? parsed.severity : 'medium',
      description: truncateText(parsed?.description, 500),
      evidenceSlot: truncateText(parsed?.evidenceSlot, 80),
    }
  } catch {
    return { location: '', severity: 'medium', description: '', evidenceSlot: '' }
  }
}

const normalizeStructuredChecklistIssue = (value) => {
  const details = getChecklistIssueDetails(value)
  return {
    location: details.location,
    severity: details.severity,
    notes: details.description,
    ...(details.evidenceSlot ? { evidenceSlot: details.evidenceSlot } : {}),
  }
}

export const buildChecklistIssueValue = ({ location, severity = 'medium', description, evidenceSlot } = {}) =>
  `${checklistIssuePrefix}${JSON.stringify({
    location: truncateText(location, 160),
    severity: ['low', 'medium', 'high'].includes(severity) ? severity : 'medium',
    description: truncateText(description, 500),
    evidenceSlot: truncateText(evidenceSlot, 80),
  })}`

export const restoreIntakeModalFocus = (target) => {
  if (
    !target ||
    typeof target.focus !== 'function' ||
    target.isConnected === false ||
    target.disabled === true ||
    target.getAttribute?.('aria-disabled') === 'true'
  ) {
    return false
  }

  target.focus()
  return true
}

export const paperChecklistStatusOptions = Object.freeze([
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'transcribed', label: 'Transcribed to digital' },
  { value: 'reviewed', label: 'Reviewed against paper' },
])

export const createInitialIntakeDraft = () => ({
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
  status: 'pending',
  notes: '',
  arrivalType: defaultArrivalType,
  visitType: defaultVisitType,
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
  nextRoute: defaultNextRoute,
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
  arrivalInspectionItems: buildDefaultArrivalInspectionItems(),
})

const addCompletionBlocker = (blockers, { key, label, missing, tab, control }) => {
  blockers.push({ key, label, missing, tab, control })
}

export const getIntakeCompletionBlockers = (draft = {}) => {
  const blockers = []

  for (const [field, missing] of requiredCompletedIntakeFields) {
    if (!String(draft[field] ?? '').trim()) {
      addCompletionBlocker(blockers, {
        key: field === 'customerUserId' ? 'customer' : field === 'vehicleId' ? 'vehicle' : field,
        label: `Complete the ${missing} field.`,
        missing,
        tab: field === 'visitType' ? 'arrival_visit' : field === 'serviceConcern' ? 'concern_requirements' : 'inspection_signoff',
        control:
          field === 'customerUserId'
            ? 'customer'
            : field === 'vehicleId'
              ? 'vehicle'
              : field === 'visitType'
                ? 'visit-type'
                : field,
      })
    }
  }

  const selectedReasons = normalizeStringArray(
    draft.reasonForVisits?.length ? draft.reasonForVisits : draft.reasonForVisit,
    intakeFieldMaxLengths.reasonForVisit,
  )
  if (!selectedReasons.length) {
    addCompletionBlocker(blockers, {
      key: 'reasonForVisit',
      label: 'Select at least one reason for the visit.',
      missing: 'reason for visit',
      tab: 'concern_requirements',
      control: 'reason-for-visit',
    })
  }

  const selectedServices = normalizeStringArray(
    draft.requestedServiceIds?.length ? draft.requestedServiceIds : draft.requestedServiceNames,
    160,
  )
  if (!selectedServices.length && !String(draft.requestedServiceSummary ?? '').trim()) {
    addCompletionBlocker(blockers, {
      key: 'requestedServices',
      label: 'Select at least one requested service.',
      missing: 'requested services',
      tab: 'concern_requirements',
      control: 'requested-services',
    })
  }

  if (!draft.customerAcknowledged) {
    addCompletionBlocker(blockers, {
      key: 'customerAcknowledged',
      label: 'Record the customer acknowledgement.',
      missing: 'customer acknowledgement',
      tab: 'inspection_signoff',
      control: 'customer-acknowledgement',
    })
  }
  if (!['verified_present', 'not_present'].includes(String(draft.stickerObservation ?? ''))) {
    addCompletionBlocker(blockers, {
      key: 'stickerObservation',
      label: 'Record whether the official Cruisers Crib sticker is affixed.',
      missing: 'vehicle sticker observation',
      tab: 'concern_requirements',
      control: 'sticker-observation',
    })
  }
  if (
    draft.stickerObservation === 'not_present' &&
    !String(draft.stickerObservationReason ?? '').trim()
  ) {
    addCompletionBlocker(blockers, {
      key: 'stickerObservationReason',
      label: 'Add a concise reason when the official sticker is not present.',
      missing: 'reason for absent vehicle sticker',
      tab: 'concern_requirements',
      control: 'sticker-observation-reason',
    })
  }
  if (draft.arrivalType === 'with_booking' && !String(draft.bookingId ?? '').trim()) {
    addCompletionBlocker(blockers, {
      key: 'booking',
      label: 'Link the eligible booking for this booked arrival.',
      missing: 'booking',
      tab: 'arrival_visit',
      control: 'booking',
    })
  }

  const requiredRequirements = getIntakeRequirementOptions({
    arrivalType: draft.arrivalType,
    visitType: draft.visitType,
  }).filter((option) => option.required)
  for (const option of requiredRequirements) {
    if (!draft.requirementsChecklist?.[option.value]) {
      addCompletionBlocker(blockers, {
        key: option.value,
        label: `Confirm ${option.label.toLowerCase()}.`,
        missing: option.label.toLowerCase(),
        tab: 'concern_requirements',
        control: option.value,
      })
    }
  }

  const arrivalInspectionItems = normalizeArrivalInspectionItems(
    draft.arrivalInspectionItems,
    draft.checklist,
  )
  for (const item of arrivalInspectionItems) {
    const itemLabel = checklistLabels[item.key] || formatLabel(item.key)
    if (item.status === 'unchecked') {
      addCompletionBlocker(blockers, {
        key: `arrivalInspection:${item.key}`,
        label: `Mark ${itemLabel} Checked OK or Issue.`,
        missing: 'arrival inspection checks',
        tab: 'inspection_signoff',
        control: `checklist-${item.key}`,
      })
    }
    const issueDetails = getChecklistIssueDetails(item.issue)
    if (
      item.status === 'issue' &&
      (!issueDetails.location || !issueDetails.description || !['low', 'medium', 'high'].includes(issueDetails.severity))
    ) {
      addCompletionBlocker(blockers, {
        key: `arrivalIssue:${item.key}`,
        label: `Add location, severity, and notes for ${itemLabel}.`,
        missing: 'arrival issue details',
        tab: 'inspection_signoff',
        control: `checklist-${item.key}`,
      })
    }
  }

  return blockers
}

export const getCompletedIntakeRequirements = (draft = {}) => {
  const blockers = getIntakeCompletionBlockers(draft)
  const missing = [...new Set(blockers.map((blocker) => blocker.missing))]

  return { ready: blockers.length === 0, missing, blockers }
}

export const getArrivalInspectionProgress = (items, legacyChecklist = {}) => {
  const normalizedItems = normalizeArrivalInspectionItems(items, legacyChecklist)
  const checked = normalizedItems.filter((item) => ['ok', 'issue'].includes(item.status)).length

  return {
    checked,
    total: normalizedItems.length,
    issues: normalizedItems.filter((item) => item.status === 'issue').length,
    complete: checked === normalizedItems.length,
  }
}

export const getArrivalInspectionCategoryProgress = (items, legacyChecklist = {}) => {
  const normalizedItems = normalizeArrivalInspectionItems(items, legacyChecklist)
  const itemsByValue = new Map(normalizedItems.map((item) => [item.key, item]))

  return arrivalInspectionCategoryOptions.map((category) => {
    const categoryItems = category.itemValues
      .map((value) => checklistItemOptions.find((item) => item.value === value))
      .filter(Boolean)
    const checked = categoryItems.filter((item) => ['ok', 'issue'].includes(itemsByValue.get(item.value)?.status)).length
    const issues = categoryItems.filter((item) => itemsByValue.get(item.value)?.status === 'issue').length

    return {
      ...category,
      items: categoryItems,
      checked,
      issues,
      total: categoryItems.length,
      complete: checked === categoryItems.length,
    }
  })
}

export const getEligibleIntakeBookings = (bookings = []) =>
  (Array.isArray(bookings) ? bookings : [])
    .filter((booking) => ['confirmed', 'in_service'].includes(String(booking?.status ?? '').trim()))
    .sort((left, right) => {
      const rightTime = Date.parse(right?.scheduledDate ?? right?.updatedAt ?? right?.createdAt ?? '') || 0
      const leftTime = Date.parse(left?.scheduledDate ?? left?.updatedAt ?? left?.createdAt ?? '') || 0
      return rightTime - leftTime
    })

export const getBookingQueryHydrationState = ({ booking, bookingId, error } = {}) => {
  if (!String(bookingId ?? '').trim()) return { status: 'idle', message: '' }
  if (error?.status === 404) {
    return {
      status: 'stale',
      message: 'This booking link is stale or the booking no longer exists.',
    }
  }
  if (error) {
    return {
      status: 'error',
      message: error.message || 'The linked booking could not be loaded.',
    }
  }
  if (!booking) return { status: 'loading', message: 'Loading the linked booking...' }
  if (String(booking.id ?? '').trim() !== String(bookingId).trim()) {
    return {
      status: 'stale',
      message: 'The booking link returned a different record. Reload the booking from the schedule.',
    }
  }
  if (!['confirmed', 'in_service'].includes(booking.status)) {
    return {
      status: 'ineligible',
      message: `Booking ${booking.bookingReference || 'Reference unavailable'} is ${formatLabel(booking.status) || 'not eligible'} and cannot be opened for intake.`,
    }
  }
  return { status: 'ready', message: 'Linked booking loaded for intake.' }
}

export const buildIntakeDraftPayload = (draft = {}) => {
  const cappedDraft = buildCappedIntakeDraft(draft)

  return {
    bookingId: cappedDraft.bookingId.trim() || undefined,
    intakeData: {
      arrivalType: cappedDraft.arrivalType,
      visitType: cappedDraft.visitType || undefined,
      reasonForVisit: cappedDraft.reasonForVisit || undefined,
      reasonForVisits: cappedDraft.reasonForVisits.length ? cappedDraft.reasonForVisits : undefined,
      requestedServiceSummary: cappedDraft.requestedServiceSummary || undefined,
      requestedServiceIds: cappedDraft.requestedServiceIds.length ? cappedDraft.requestedServiceIds : undefined,
      requestedServiceNames: cappedDraft.requestedServiceNames.length ? cappedDraft.requestedServiceNames : undefined,
      customerConcerns: cappedDraft.customerConcerns.length ? cappedDraft.customerConcerns : undefined,
      serviceConcern: cappedDraft.serviceConcern || undefined,
      currentOdometerKm: cappedDraft.currentOdometerKm
        ? Number(cappedDraft.currentOdometerKm)
        : undefined,
      fuelLevel: cappedDraft.fuelLevel || undefined,
      requirementsChecklist: cappedDraft.requirementsChecklist,
      preServiceChecklist: { ...cappedDraft.checklist },
      arrivalInspectionItems: cappedDraft.arrivalInspectionItems,
      damageAreas: cappedDraft.damageAreas?.length ? [...cappedDraft.damageAreas] : undefined,
      damageNotes: cappedDraft.damageNotes || undefined,
      customerItems: cappedDraft.customerItems || undefined,
      customerAcknowledged: Boolean(cappedDraft.customerAcknowledged),
      customerSignatureName: cappedDraft.customerSignatureName || undefined,
      paperChecklistStatus: normalizeControlValue(
        cappedDraft.paperChecklistStatus,
        allowedPaperChecklistStatuses,
        'not_started',
      ),
      isRepeatVisit: Boolean(cappedDraft.isRepeatVisit),
      urgencyFlag: Boolean(cappedDraft.urgencyFlag),
      missingRequirementsNote: cappedDraft.missingRequirementsNote || undefined,
      safetyAccessNotes: cappedDraft.safetyAccessNotes || undefined,
      stickerObservation: cappedDraft.stickerObservation || undefined,
      stickerObservationReason:
        cappedDraft.stickerObservation === 'not_present'
          ? cappedDraft.stickerObservationReason || undefined
          : undefined,
    },
    notes: truncateText(buildIntakeInspectionNotes(cappedDraft), maxNotesLength),
  }
}

export const hydrateIntakeDraft = (record = {}, context = {}) => {
  const intakeData = record?.intakeData && typeof record.intakeData === 'object' ? record.intakeData : {}
  const initial = createInitialIntakeDraft()

  return {
    ...initial,
    ...intakeData,
    customerUserId: String(context.customerUserId ?? record.customerUserId ?? ''),
    vehicleId: String(context.vehicleId ?? record.vehicleId ?? ''),
    bookingId: String(record.bookingId ?? context.bookingId ?? ''),
    status: record.status === 'completed' ? 'completed' : 'pending',
    notes: String(record.notes ?? ''),
    stickerObservation: ['verified_present', 'not_present'].includes(intakeData.stickerObservation)
      ? intakeData.stickerObservation
      : '',
    stickerObservationReason: truncateText(
      intakeData.stickerObservationReason,
      intakeFieldMaxLengths.stickerObservationReason,
    ),
    reasonForVisits: normalizeStringArray(
      intakeData.reasonForVisits?.length ? intakeData.reasonForVisits : intakeData.reasonForVisit,
      intakeFieldMaxLengths.reasonForVisit,
    ),
    requestedServiceIds: normalizeStringArray(intakeData.requestedServiceIds, 80),
    requestedServiceNames: normalizeStringArray(intakeData.requestedServiceNames, 160),
    safetyAccessNotes: String(intakeData.safetyAccessNotes ?? ''),
    requirementsChecklist: {
      ...initial.requirementsChecklist,
      ...(intakeData.requirementsChecklist ?? {}),
    },
    arrivalInspectionItems: normalizeArrivalInspectionItems(
      intakeData.arrivalInspectionItems,
      intakeData.preServiceChecklist ?? intakeData.checklist,
    ),
    checklist: {
      ...initial.checklist,
      ...Object.fromEntries(
        normalizeArrivalInspectionItems(
          intakeData.arrivalInspectionItems,
          intakeData.preServiceChecklist ?? intakeData.checklist,
        ).map((item) => [item.key, getLegacyChecklistValue(item)]),
      ),
    },
    damageAreas: Array.isArray(intakeData.damageAreas) ? intakeData.damageAreas : [],
    arrivalPhotos: {
      ...initial.arrivalPhotos,
      ...(intakeData.arrivalPhotos ?? {}),
    },
    paperChecklistStatus: normalizeControlValue(
      intakeData.paperChecklistStatus,
      allowedPaperChecklistStatuses,
      'not_started',
    ),
    reasonForVisit:
      normalizeStringArray(
        intakeData.reasonForVisits?.length ? intakeData.reasonForVisits : intakeData.reasonForVisit,
        intakeFieldMaxLengths.reasonForVisit,
      )[0] ?? String(intakeData.reasonForVisit ?? ''),
    requestedServiceSummary:
      normalizeStringArray(intakeData.requestedServiceNames, 160).join(', ') ||
      String(intakeData.requestedServiceSummary ?? ''),
    customerConcerns: normalizeCustomerConcernObjects(
      intakeData.customerConcerns?.length ? intakeData.customerConcerns : intakeData.serviceConcern,
    ),
  }
}

const completionReceiptByVisitType = Object.freeze({
  regular_service: {
    destination: 'Workshop',
    actionLabel: 'Open Job Order',
    fallbackPath: '/admin/job-orders',
  },
  insurance_related: {
    destination: 'Insurance',
    actionLabel: 'Continue to Insurance',
    fallbackPath: '/insurance',
  },
  back_job_complaint: {
    destination: 'Back Jobs',
    actionLabel: 'Continue to Back Jobs',
    fallbackPath: '/backjobs',
  },
  inspection_only: {
    destination: 'Inspection History',
    actionLabel: 'Review Inspection',
    fallbackPath: '/admin/intake-inspections',
  },
})

export const buildIntakeCompletionReceipt = ({ draft = {}, result = {} } = {}) => {
  const action = completionReceiptByVisitType[draft.visitType] ?? completionReceiptByVisitType.regular_service
  const inspection = result.inspection ?? result
  const jobOrderId = result.jobOrder?.id ?? result.jobOrderId ?? null

  return {
    destination: action.destination,
    actionLabel: action.actionLabel,
    path: jobOrderId ? `/admin/job-orders/${jobOrderId}` : action.fallbackPath,
    inspectionId: inspection?.id ?? result.inspectionId ?? null,
    inspectionReference: inspection?.inspectionReference ?? result.inspectionReference ?? null,
    completedAt: inspection?.completedAt ?? result.completedAt ?? new Date().toISOString(),
    version: inspection?.version ?? result.version ?? null,
    jobOrderId,
  }
}

export const buildIntakeInspectionNotes = (draft) => {
  const cappedDraft = buildCappedIntakeDraft(draft)
  const requirementSummary = getIntakeRequirementOptions({
    arrivalType: cappedDraft.arrivalType,
    visitType: cappedDraft.visitType,
  })
    .map((option) => {
      const checked = cappedDraft.requirementsChecklist?.[option.value]
      return `${option.label}: ${checked ? 'Present' : option.required ? 'Missing' : 'Not confirmed'}`
    })
    .join('\n')

  const damageAreas = cappedDraft.damageAreas
    .map((area) => damageAreaLabels[area] || area)
    .join(', ')

  const checklistNotes = Object.entries(cappedDraft.checklist)
    .map(([key, value]) => {
      const status = getChecklistStatus(value)
      if (status === 'unchecked') return `${checklistLabels[key] || key}: Unchecked`
      if (status !== 'issue') return `${checklistLabels[key] || key}: OK`
      const details = getChecklistIssueDetails(value)
      const explanation = [details.location, details.severity, details.description].filter(Boolean).join(' - ')
      return `${checklistLabels[key] || key}: Issue${explanation ? ` (${explanation})` : ''}`
    })
    .join('\n')

  const intakeDetailLines = [
    `Arrival mode: ${formatLabel(cappedDraft.arrivalType) || 'Not provided'}`,
    `Visit type: ${formatLabel(cappedDraft.visitType) || 'Not provided'}`,
    cappedDraft.reasonForVisit ? `Reason for visit: ${cappedDraft.reasonForVisit}` : null,
    cappedDraft.requestedServiceSummary
      ? `Requested service summary: ${cappedDraft.requestedServiceSummary}`
      : null,
    cappedDraft.isRepeatVisit ? 'Repeat visit: Yes' : null,
    cappedDraft.urgencyFlag ? 'Urgent visit: Yes' : null,
    `Next route: ${formatLabel(cappedDraft.nextRoute) || 'Not provided'}`,
    cappedDraft.missingRequirementsNote
      ? `Missing requirements note: ${cappedDraft.missingRequirementsNote}`
      : null,
    cappedDraft.safetyAccessNotes ? `Safety or access notes: ${cappedDraft.safetyAccessNotes}` : null,
    cappedDraft.reasonForVisits.length > 1
      ? `Reasons for visit: ${cappedDraft.reasonForVisits.join(', ')}`
      : null,
    cappedDraft.requestedServiceNames.length > 0
      ? `Requested services: ${cappedDraft.requestedServiceNames.join(', ')}`
      : null,
  ].filter(Boolean)

  const vehicleConditionLines = [
    cappedDraft.currentOdometerKm ? `Current odometer (km): ${cappedDraft.currentOdometerKm}` : null,
    cappedDraft.fuelLevel ? `Fuel level on arrival: ${cappedDraft.fuelLevel}` : null,
    damageAreas ? `Damage areas: ${damageAreas}` : null,
    cappedDraft.damageNotes ? `Damage notes: ${cappedDraft.damageNotes}` : null,
  ].filter(Boolean)

  return [
    'SERVICE CONCERN',
    cappedDraft.serviceConcern || 'Not provided',
    '',
    'INTAKE DETAILS',
    ...intakeDetailLines,
    '',
    'REQUIREMENTS CHECKLIST',
    requirementSummary || 'No intake requirements recorded',
    '',
    ...vehicleConditionLines,
    '',
    'ARRIVAL INSPECTION',
    checklistNotes,
    '',
    'CUSTOMER ITEMS',
    cappedDraft.customerItems || 'None noted',
    '',
    'CUSTOMER ACKNOWLEDGMENT',
    `Acknowledged: ${cappedDraft.customerAcknowledged ? 'Yes' : 'No'}`,
    `Customer signature: ${cappedDraft.customerSignatureName || 'Not captured'}`,
    `Received by staff: ${cappedDraft.receivedByStaff || 'Not assigned'}`,
    `Paper checklist: ${formatLabel(cappedDraft.paperChecklistStatus) || 'Not Started'}`,
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

  for (const item of cappedDraft.arrivalInspectionItems) {
    if (getChecklistStatus(item) !== 'issue') continue
    const details = getChecklistIssueDetails(item)
    findings.push({
      category: 'mechanical',
      label: `${checklistLabels[item.key] || formatLabel(item.key)} issue`,
      severity: details.severity,
      notes: [details.location, details.description].filter(Boolean).join(' - ') || 'Issue requires inspection.',
      isVerified: true,
    })
  }

  const notes = appendWithinNoteBudget(
    buildIntakeInspectionNotes(cappedDraft),
    cappedDraft.notes,
  )

  return {
    inspectionType: 'intake',
    status: cappedDraft.status || 'completed',
    bookingId: cappedDraft.bookingId.trim() || undefined,
    inspectorUserId: userId,
    notes,
    attachmentRefs,
    findings,
  }
}
