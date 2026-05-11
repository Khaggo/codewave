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

const maxNotesLength = 1000

const normalizeAttachmentRefs = (arrivalPhotos) =>
  [...new Set(
    Object.values(arrivalPhotos)
      .map((ref) => String(ref ?? '').trim())
      .filter(Boolean),
  )]

const capInspectionNotes = (value) => String(value ?? '').trim().slice(0, maxNotesLength)

export const createInitialIntakeDraft = () => ({
  customerUserId: '',
  vehicleId: '',
  bookingId: '',
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
  const damageAreas = draft.damageAreas
    .map((area) => damageAreaLabels[area] || area)
    .join(', ')

  const checklistNotes = Object.entries(draft.checklist)
    .map(([key, value]) => `${checklistLabels[key] || key}: ${value === 'issue' ? 'Issue' : 'OK'}`)
    .join('\n')

  return [
    'SERVICE CONCERN',
    draft.serviceConcern || 'Not provided',
    '',
    'INTAKE DETAILS',
    `Current odometer (km): ${draft.currentOdometerKm || 'Not provided'}`,
    `Fuel level on arrival: ${draft.fuelLevel || 'Not provided'}`,
    `Damage areas: ${damageAreas || 'None marked'}`,
    `Damage notes: ${draft.damageNotes || 'None'}`,
    '',
    'PRE-SERVICE CHECKLIST',
    checklistNotes,
    '',
    'CUSTOMER ITEMS',
    draft.customerItems || 'None noted',
    '',
    'CUSTOMER ACKNOWLEDGMENT',
    `Acknowledged: ${draft.customerAcknowledged ? 'Yes' : 'No'}`,
    `Customer signature: ${draft.customerSignatureName || 'Not captured'}`,
    `Received by staff: ${draft.receivedByStaff || 'Not assigned'}`,
  ].join('\n')
}

export const buildIntakeInspectionPayload = ({ draft, userId }) => {
  const attachmentRefs = normalizeAttachmentRefs(draft.arrivalPhotos)
  const damageLabels = draft.damageAreas.map((area) => damageAreaLabels[area] || area)
  const damageNotes = [damageLabels.join(', '), draft.damageNotes.trim()].filter(Boolean).join(' | ')
  const findings = damageLabels.length || draft.damageNotes.trim()
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

  const notes = capInspectionNotes([buildIntakeInspectionNotes(draft), draft.notes.trim()].filter(Boolean).join('\n\n'))

  return {
    inspectionType: 'intake',
    status: 'completed',
    bookingId: draft.bookingId.trim() || undefined,
    inspectorUserId: userId,
    notes,
    attachmentRefs,
    findings,
  }
}
