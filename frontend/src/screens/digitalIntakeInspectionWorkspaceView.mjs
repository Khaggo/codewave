export const getIntakeWorkspaceHeroCopy = () => ({
  title: 'Front-Desk Arrival Intake',
  description: 'Check in arrivals and capture vehicle condition before handoff.',
})

const PRIMARY_ACTION_LABELS = {
  regular_service: 'Start service check-in',
  insurance_related: 'Start insurance check-in',
  back_job_complaint: 'Start return visit check-in',
  inspection_only: 'Start inspection check-in',
}

export const getIntakeWorkspacePrimaryActionLabel = (visitType) =>
  PRIMARY_ACTION_LABELS[visitType] ?? 'Start intake check-in'
