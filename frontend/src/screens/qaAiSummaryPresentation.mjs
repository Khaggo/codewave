export const getQaAiSummaryState = (qualityGate) => {
  const summary = qualityGate?.preCheckSummary?.aiSummary
  return summary && typeof summary === 'object'
    ? summary
    : { status: 'not_requested', summaryText: null }
}

export const getQaAiSummaryAction = ({ qualityGate, canGenerate, actionStatus }) => {
  const summary = getQaAiSummaryState(qualityGate)
  if (actionStatus === 'ai_summary_loading' || ['queued', 'generating'].includes(summary.status)) {
    return { label: 'Generating…', disabled: true }
  }
  if (!canGenerate) {
    return { label: 'Generate Summary', disabled: true }
  }
  if (summary.status === 'ready') {
    return { label: 'Regenerate', disabled: false }
  }
  if (['generation_failed', 'stale', 'unavailable'].includes(summary.status)) {
    return { label: 'Retry', disabled: false }
  }
  return { label: 'Generate Summary', disabled: false }
}

export const getQaAiSummaryStatusLabel = (status) => ({
  not_requested: 'Not generated',
  queued: 'Queued',
  generating: 'Generating',
  ready: 'Ready',
  generation_failed: 'Generation failed',
  stale: 'Evidence changed',
  unavailable: 'Unavailable',
}[status] ?? 'Not generated')
