export function toJobOrderClaimSummary({ claim, entityId, entityType = 'job_order' } = {}) {
  const id = String(claim?.id ?? '').trim()
  const normalizedEntityId = String(claim?.entityId ?? entityId ?? '').trim()
  const normalizedEntityType = String(claim?.entityType ?? entityType ?? '').trim()

  if (!id || !normalizedEntityId || !normalizedEntityType) {
    return null
  }

  return {
    id,
    entityId: normalizedEntityId,
    entityType: normalizedEntityType,
    leaseExpiresAt: claim?.leaseExpiresAt ?? null,
  }
}

export function claimMatchesWork(claim, entityType, entityId) {
  return Boolean(
    claim?.id &&
      claim.entityType === entityType &&
      claim.entityId === entityId,
  )
}

export function isStaffWorkClaimError(error) {
  const code = String(error?.details?.code ?? '')
  return error?.status === 409 && [
    'WORK_CLAIM_CONTEXT_MISSING',
    'WORK_CLAIM_REQUIRED',
    'WORK_CLAIM_CONFLICT',
    'WORK_NOT_ELIGIBLE',
    'ACTIVE_WORK_EXISTS',
    'WORK_CAPACITY_REACHED',
  ].includes(code)
}

export function recoverMatchingJobOrderClaim(queueResult, jobOrderId) {
  const matchingItem = queueResult?.items?.find(
    (item) => item.entityType === 'job_order' && item.entityId === jobOrderId,
  )
  if (matchingItem?.claim?.isMine) {
    return toJobOrderClaimSummary({
      claim: matchingItem.claim,
      entityId: matchingItem.entityId,
      entityType: matchingItem.entityType,
    })
  }

  const sessionClaim = queueResult?.session?.currentClaim
  return claimMatchesWork(sessionClaim, 'job_order', jobOrderId)
    ? toJobOrderClaimSummary({ claim: sessionClaim })
    : null
}

export function getJobOrderClaimConflictMessage(error) {
  switch (String(error?.details?.code ?? '')) {
    case 'ACTIVE_WORK_EXISTS':
    case 'WORK_CAPACITY_REACHED':
      return 'Your Job Order workload is at capacity. Complete or release one assignment before taking another.'
    case 'WORK_NOT_ELIGIBLE':
      return 'This record has moved to another workflow stage. Refresh the queue before continuing.'
    case 'WORK_CLAIM_REQUIRED':
    case 'WORK_CLAIM_CONTEXT_MISSING':
    case 'WORK_CLAIM_CONFLICT':
      return 'Your Job Order assignment changed or expired. Refresh ownership or take the job again.'
    default:
      return error?.message || 'This Job Order could not be claimed.'
  }
}
