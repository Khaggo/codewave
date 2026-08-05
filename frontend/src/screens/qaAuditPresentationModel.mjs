import { getJobOrderReference } from '../lib/businessReferenceDisplay.mjs'

export function formatQaJobOrderReference(jobOrder) {
  return getJobOrderReference(jobOrder)
}

export function getLoadedJobOrderReference(
  jobOrderId,
  jobOrderOptions = [],
  qualityGate = null,
) {
  if (qualityGate?.jobOrderReference) return qualityGate.jobOrderReference

  const matchingJobOrder =
    jobOrderOptions.find((jobOrder) => jobOrder.id === jobOrderId) ??
    (qualityGate?.jobOrderId
      ? jobOrderOptions.find(
          (jobOrder) => jobOrder.id === qualityGate.jobOrderId,
        )
      : null)

  return matchingJobOrder ? formatQaJobOrderReference(matchingJobOrder) : 'Reference unavailable'
}
