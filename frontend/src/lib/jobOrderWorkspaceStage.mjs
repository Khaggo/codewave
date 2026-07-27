export function isQaClearedForFinalization(qualityGate) {
  return Boolean(
    qualityGate
      && ['passed', 'overridden'].includes(qualityGate.status)
      && qualityGate.reviewerVerdict === 'passed',
  )
}

export function getSuggestedJobOrderWorkspaceStage(
  jobOrder,
  fallbackStage = 'overview',
  qualityGate = null,
) {
  if (!jobOrder) return 'queue'

  const hasSavedAssignments = Array.isArray(jobOrder.assignedTechnicianIds)
    && jobOrder.assignedTechnicianIds.length > 0
  const hasProgressEntries = Array.isArray(jobOrder.progressEntries)
    && jobOrder.progressEntries.length > 0
  const hasPhotoEvidence = Array.isArray(jobOrder.photos) && jobOrder.photos.length > 0
  const hasInvoiceRecord = Boolean(jobOrder.invoiceRecord)

  if (!hasSavedAssignments) return 'assignments'

  if (['assigned', 'in_progress', 'blocked'].includes(jobOrder.status)) {
    if (!hasProgressEntries) return 'progress'
    if (!hasPhotoEvidence) return 'evidence'
    return 'progress'
  }

  if (jobOrder.status === 'ready_for_qa') {
    return isQaClearedForFinalization(qualityGate) ? 'finalize' : 'qa'
  }

  if (hasInvoiceRecord) return 'finalize'
  return fallbackStage
}
