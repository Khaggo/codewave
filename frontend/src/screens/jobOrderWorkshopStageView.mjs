const BASE_WORKSHOP_STAGES = Object.freeze([
  { value: 'received', label: 'Received' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'in_repair', label: 'In Repair' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'ready', label: 'Ready' },
])

const formatStageLabel = (value) =>
  String(value ?? '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export const createWorkshopStageDraft = (stage = 'received') => ({
  stage: String(stage ?? '').trim() || 'received',
  note: '',
})

export const getWorkshopStageOptions = (selectedStage) => {
  const normalizedStage = String(selectedStage ?? '').trim()

  if (!normalizedStage || BASE_WORKSHOP_STAGES.some((option) => option.value === normalizedStage)) {
    return BASE_WORKSHOP_STAGES
  }

  return Object.freeze([
    ...BASE_WORKSHOP_STAGES,
    Object.freeze({
      value: normalizedStage,
      label: formatStageLabel(normalizedStage),
    }),
  ])
}

export const getWorkshopStageMessageClassName = (status) =>
  status === 'error'
    ? 'status-message status-message-danger'
    : 'status-message status-message-success'

