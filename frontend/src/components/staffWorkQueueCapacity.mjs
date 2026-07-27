export function getStaffWorkQueueCapacityState(session = {}) {
  const capacityValue = Number(session.capacity)
  const capacity = Number.isInteger(capacityValue) && capacityValue > 0
    ? capacityValue
    : 1
  const activeClaims = Array.isArray(session.activeClaims)
    ? session.activeClaims
    : session.currentClaim
      ? [session.currentClaim]
      : []
  const countValue = Number(session.activeClaimCount)
  const activeClaimCount = Number.isInteger(countValue) && countValue >= 0
    ? countValue
    : activeClaims.length

  return {
    activeClaims,
    activeClaimCount,
    capacity,
    remainingCapacity: Math.max(0, capacity - activeClaimCount),
    hasCapacity: activeClaimCount < capacity,
  }
}
