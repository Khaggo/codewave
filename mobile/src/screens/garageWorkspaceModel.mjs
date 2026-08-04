const normalizeVehicleId = (value) => String(value ?? '').trim() || null

export const resolveGarageWorkspaceVehicleId = ({
  routeVehicleId,
  currentVehicleId,
  primaryVehicleId,
  vehicles,
  allowUnknownRoute = false,
}) => {
  const ownedVehicles = Array.isArray(vehicles) ? vehicles : []
  const ownedVehicleIds = new Set(
    ownedVehicles
      .map((vehicle) => normalizeVehicleId(vehicle?.id))
      .filter(Boolean),
  )
  const normalizedRouteVehicleId = normalizeVehicleId(routeVehicleId)

  if (
    normalizedRouteVehicleId &&
    (allowUnknownRoute || ownedVehicleIds.has(normalizedRouteVehicleId))
  ) {
    return normalizedRouteVehicleId
  }

  const candidates = [currentVehicleId, primaryVehicleId]
    .map(normalizeVehicleId)
    .filter(Boolean)
  const ownedCandidate = candidates.find((vehicleId) =>
    ownedVehicleIds.has(vehicleId),
  )

  return ownedCandidate ?? normalizeVehicleId(ownedVehicles[0]?.id)
}

export const createGarageWorkspaceInitialState = ({
  account,
  routeVehicleId,
  pageSize,
}) => {
  const ownedVehicles = Array.isArray(account?.ownedVehicles)
    ? account.ownedVehicles
    : []
  const vehicles = ownedVehicles.slice(0, pageSize)

  return {
    selectedVehicleId: resolveGarageWorkspaceVehicleId({
      routeVehicleId,
      primaryVehicleId: account?.primaryVehicleId,
      vehicles: ownedVehicles,
      allowUnknownRoute: true,
    }),
    vehicles,
    page: normalizeGarageWorkspacePage(
      {
        currentPage: 0,
        limit: pageSize,
        total: ownedVehicles.length,
        hasNext: ownedVehicles.length > pageSize,
        nextCursor: null,
      },
      pageSize,
    ),
  }
}

export const normalizeGarageWorkspacePage = (page, defaultLimit = 3) => ({
  currentPage: Math.max(0, Number(page?.currentPage) || 0),
  limit: Math.max(1, Number(page?.limit) || defaultLimit),
  total: Math.max(0, Number(page?.total) || 0),
  hasNext: Boolean(page?.hasNext),
  nextCursor:
    typeof page?.nextCursor === 'string' && page.nextCursor
      ? page.nextCursor
      : null,
})

export const getGarageLoadErrorMessage = (error, fallbackMessage) =>
  String(error?.message ?? '').trim() || fallbackMessage

export const getPreviousGaragePageRequest = (page, cursorHistory = []) => {
  const currentPage = Math.max(0, Number(page?.currentPage) || 0)
  if (currentPage === 0) return null
  const pageIndex = currentPage - 1

  return {
    cursor: cursorHistory[pageIndex] ?? null,
    pageIndex,
    preferredVehicleId: null,
  }
}

export const getNextGaragePageRequest = (page) => {
  if (!page?.hasNext || !page?.nextCursor) return null

  return {
    cursor: page.nextCursor,
    pageIndex: Math.max(0, Number(page.currentPage) || 0) + 1,
    preferredVehicleId: null,
  }
}

export const mergeGarageTimelinePage = ({ snapshot, nextEvents, page }) => {
  const mergedEvents = [...(snapshot?.events ?? []), ...(nextEvents ?? [])]
  const events = [
    ...new Map(mergedEvents.map((event) => [event.id, event])).values(),
  ]
  const verifiedEvents = events.filter(
    (event) => event.statusTone === 'verified',
  ).length

  return {
    ...snapshot,
    timelineState: events.length ? 'timeline_ready' : 'timeline_empty',
    events,
    stats: {
      totalEvents: events.length,
      verifiedEvents,
      administrativeEvents: events.length - verifiedEvents,
    },
    page,
  }
}

export const buildGarageWorkspacePageModel = ({ page, vehicles }) => {
  const visibleVehicles = Array.isArray(vehicles) ? vehicles : []
  const limit = Math.max(1, Number(page?.limit) || visibleVehicles.length || 3)
  const totalVehicles = Math.max(
    visibleVehicles.length,
    Number(page?.total) || visibleVehicles.length,
  )
  const currentPage = Math.max(0, Number(page?.currentPage) || 0)
  const firstVisibleNumber = visibleVehicles.length ? currentPage * limit + 1 : 0

  return {
    currentPage,
    firstVisibleNumber,
    lastVisibleNumber: visibleVehicles.length
      ? firstVisibleNumber + visibleVehicles.length - 1
      : 0,
    totalPages: Math.max(1, Math.ceil(totalVehicles / limit)),
    totalVehicles,
    visibleVehicles,
  }
}

const terminalWorkshopHelpers = {
  cancelled: 'Work closed',
  completed: 'Service complete',
  finalized: 'Service complete',
}

export const buildGarageWorkshopMetric = (latestJob) => {
  const status = String(latestJob?.status ?? '').trim().toLowerCase()
  const workshopStage = String(latestJob?.workshopStage ?? '').trim()

  if (!status) {
    return {
      helper: 'No active work',
      value: 'None',
    }
  }

  return {
    helper:
      terminalWorkshopHelpers[status] ??
      (workshopStage
        ? workshopStage.replaceAll('_', ' ')
        : 'Workshop update pending'),
    value: status.replaceAll('_', ' '),
  }
}
