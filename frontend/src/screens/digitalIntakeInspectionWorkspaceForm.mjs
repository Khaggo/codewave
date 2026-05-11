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

export const intakeFieldMaxLengths = Object.freeze({
  currentOdometerKm: 20,
  fuelLevel: 20,
  serviceConcern: 120,
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

const buildCappedIntakeDraft = (draft) => ({
  ...draft,
  currentOdometerKm: truncateText(draft.currentOdometerKm, intakeFieldMaxLengths.currentOdometerKm),
  fuelLevel: truncateText(draft.fuelLevel, intakeFieldMaxLengths.fuelLevel),
  serviceConcern: truncateText(draft.serviceConcern, intakeFieldMaxLengths.serviceConcern),
  damageNotes: truncateText(draft.damageNotes, intakeFieldMaxLengths.damageNotes),
  customerItems: truncateText(draft.customerItems, intakeFieldMaxLengths.customerItems),
  customerSignatureName: truncateText(draft.customerSignatureName, intakeFieldMaxLengths.customerSignatureName),
  receivedByStaff: truncateText(draft.receivedByStaff, intakeFieldMaxLengths.receivedByStaff),
  notes: truncateText(draft.notes, intakeFieldMaxLengths.notes),
})

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
    notes,
    attachmentRefs,
    findings,
  }
}
