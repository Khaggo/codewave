export const getIntakeWorkspaceHeroCopy = () => ({
  title: 'Front-Desk Arrival Intake',
  description: 'Check in arrivals and capture vehicle condition before handoff.',
})

export const INTAKE_STAGE_ORDER = [
  { key: 'arrival', label: 'Arrival' },
  { key: 'visit_type', label: 'Visit Type' },
  { key: 'concerns_services', label: 'Concerns & Services' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'arrival_inspection', label: 'Arrival Inspection' },
  { key: 'review_handoff', label: 'Review & Handoff' },
]

export const getAdjacentIntakeStage = (stageKey, direction) => {
  const currentIndex = INTAKE_STAGE_ORDER.findIndex((stage) => stage.key === stageKey)
  if (currentIndex < 0) return INTAKE_STAGE_ORDER[0].key

  const nextIndex = currentIndex + (direction === 'previous' ? -1 : 1)
  return INTAKE_STAGE_ORDER[Math.max(0, Math.min(nextIndex, INTAKE_STAGE_ORDER.length - 1))].key
}

export const canNavigateFromVisitTypeStage = ({
  currentStage,
  targetStage,
  visitTypeReady,
  targetStageState = 'blocked',
  allowCompletedRevisit = false,
} = {}) => {
  if (currentStage !== 'visit_type' || visitTypeReady) return true

  const currentIndex = INTAKE_STAGE_ORDER.findIndex((stage) => stage.key === currentStage)
  const targetIndex = INTAKE_STAGE_ORDER.findIndex((stage) => stage.key === targetStage)
  if (targetIndex < 0) return false
  if (targetIndex <= currentIndex) return true

  return allowCompletedRevisit && targetStageState === 'ready'
}

export const getIntakeStageKeyForBlocker = (blocker) => {
  if (!blocker) return INTAKE_STAGE_ORDER[0].key

  if (blocker.tab === 'arrival_visit') {
    return blocker.control === 'visit-type' ? 'visit_type' : 'arrival'
  }

  if (blocker.tab === 'concern_requirements') {
    return ['reason-for-visit', 'service-concern', 'requested-services'].includes(blocker.control)
      ? 'concerns_services'
      : 'requirements'
  }

  if (blocker.tab === 'inspection_signoff') {
    return blocker.control?.startsWith('checklist-') ||
      ['odometer', 'customer-acknowledgement'].includes(blocker.control)
      ? 'arrival_inspection'
      : 'review_handoff'
  }

  return INTAKE_STAGE_ORDER[0].key
}

export const getIntakeStageStatusText = (state) => {
  if (state === 'ready') return 'Complete'
  if (state === 'blocked') return 'Needs attention'
  return 'Not started'
}

const PRIMARY_ACTION_LABELS = {
  regular_service: 'Save Service Intake',
  insurance_related: 'Save Insurance Intake',
  back_job_complaint: 'Save Complaint Intake',
  inspection_only: 'Save Inspection',
}

export const getIntakeWorkspacePrimaryActionLabel = (visitType) =>
  PRIMARY_ACTION_LABELS[visitType] ?? 'Save Intake'

export const getArrivalPhotoTemporaryRef = (slot) => `upload://vehicle/${slot}`

export const isArrivalPhotoTemporaryRef = (value) =>
  /^upload:\/\/vehicle\/[^/]+$/.test(String(value ?? '').trim())

export const getArrivalPhotoButtonLabel = (fileName) =>
  String(fileName ?? '').trim() ? 'Replace photo' : 'Add photo'

export const getArrivalPhotoDisplayLabel = (fileName) =>
  String(fileName ?? '').trim() || 'No photo selected'

const LEGACY_REQUIREMENTS_CHECKLIST_FIELDS = [
  'bookingFound',
  'orCrPresent',
  'validIdPresent',
  'oldPolicyPresent',
  'supportingDocsPresent',
]

export const getIntakeRequirementsBadge = (
  requirementsChecklist,
  missingRequirementsNote,
  requirementOptions = null,
) => {
  const fields =
    Array.isArray(requirementOptions) && requirementOptions.length
      ? requirementOptions.map((option) => option.value)
      : LEGACY_REQUIREMENTS_CHECKLIST_FIELDS
  const checkedCount = fields.filter((field) =>
    Boolean(requirementsChecklist?.[field]),
  ).length

  if (String(missingRequirementsNote ?? '').trim()) {
    return 'Needs follow-up'
  }

  if (!checkedCount) {
    return 'Pending check'
  }

  if (checkedCount === fields.length) {
    return 'Ready to hand off'
  }

  return 'Partially checked'
}
