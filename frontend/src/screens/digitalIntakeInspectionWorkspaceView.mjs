export const getIntakeWorkspaceHeroCopy = () => ({
  title: 'Front-Desk Arrival Intake',
  description: 'Check in arrivals and capture vehicle condition before handoff.',
})

const PRIMARY_ACTION_LABELS = {
  regular_service: 'Save Service Intake',
  insurance_related: 'Save Insurance Intake',
  back_job_complaint: 'Save Complaint Intake',
  inspection_only: 'Save Inspection',
}

export const getIntakeWorkspacePrimaryActionLabel = (visitType) =>
  PRIMARY_ACTION_LABELS[visitType] ?? 'Save Intake'

const REQUIREMENTS_CHECKLIST_FIELDS = [
  'bookingFound',
  'orCrPresent',
  'validIdPresent',
  'oldPolicyPresent',
  'supportingDocsPresent',
]

export const getIntakeRequirementsBadge = (requirementsChecklist, missingRequirementsNote) => {
  const checkedCount = REQUIREMENTS_CHECKLIST_FIELDS.filter((field) =>
    Boolean(requirementsChecklist?.[field]),
  ).length

  if (String(missingRequirementsNote ?? '').trim()) {
    return 'Needs follow-up'
  }

  if (!checkedCount) {
    return 'Pending check'
  }

  if (checkedCount === REQUIREMENTS_CHECKLIST_FIELDS.length) {
    return 'Ready to hand off'
  }

  return 'Partially checked'
}
