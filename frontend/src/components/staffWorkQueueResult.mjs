const emptyQueueResult = {
  items: [],
  page: { hasNext: false, nextCursor: null },
  summary: {
    total: 0,
    assigned: 0,
    unassigned: 0,
    mine: 0,
    blocked: 0,
    overdue: 0,
    oldestWaitSeconds: 0,
  },
  session: {
    available: false,
    capacity: 1,
    activeClaimCount: 0,
    remainingCapacity: 1,
    activeClaims: [],
    currentClaimId: null,
    currentClaim: null,
  },
}

export function createEmptyStaffWorkQueueResult() {
  return {
    ...emptyQueueResult,
    items: [],
    page: { ...emptyQueueResult.page },
    summary: { ...emptyQueueResult.summary },
    session: { ...emptyQueueResult.session, activeClaims: [] },
  }
}

export function normalizeStaffWorkQueueResult(value, maxItems = 25) {
  const source = value && typeof value === 'object' ? value : {}
  const itemLimit = Number.isFinite(maxItems)
    ? Math.min(Math.max(Math.trunc(maxItems), 1), 50)
    : 50

  return {
    ...source,
    items: Array.isArray(source.items) ? source.items.slice(0, itemLimit) : [],
    page: source.page && typeof source.page === 'object'
      ? { ...emptyQueueResult.page, ...source.page }
      : { ...emptyQueueResult.page },
    summary: source.summary && typeof source.summary === 'object'
      ? { ...emptyQueueResult.summary, ...source.summary }
      : { ...emptyQueueResult.summary },
    session: source.session && typeof source.session === 'object'
      ? {
          ...emptyQueueResult.session,
          ...source.session,
          activeClaims: Array.isArray(source.session.activeClaims)
            ? source.session.activeClaims.slice(0, 50)
            : [],
        }
      : { ...emptyQueueResult.session, activeClaims: [] },
  }
}
