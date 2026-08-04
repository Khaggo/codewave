export const GARAGE_PAGE_SIZE = 3

export function getGaragePageCount(vehicleCount, pageSize = GARAGE_PAGE_SIZE) {
  const normalizedCount = Math.max(0, Number(vehicleCount) || 0)
  const normalizedPageSize = Math.max(1, Number(pageSize) || GARAGE_PAGE_SIZE)
  return Math.max(1, Math.ceil(normalizedCount / normalizedPageSize))
}

export function clampGaragePage(
  page,
  vehicleCount,
  pageSize = GARAGE_PAGE_SIZE,
) {
  const lastPage = getGaragePageCount(vehicleCount, pageSize) - 1
  return Math.min(Math.max(0, Number(page) || 0), lastPage)
}

export function getGaragePageModel({
  vehicles = [],
  page = 0,
  pageSize = GARAGE_PAGE_SIZE,
} = {}) {
  const currentPage = clampGaragePage(page, vehicles.length, pageSize)
  const startIndex = currentPage * pageSize
  const endIndex = Math.min(startIndex + pageSize, vehicles.length)

  return {
    currentPage,
    totalPages: getGaragePageCount(vehicles.length, pageSize),
    visibleVehicles: vehicles.slice(startIndex, endIndex),
    firstVisibleNumber: vehicles.length ? startIndex + 1 : 0,
    lastVisibleNumber: endIndex,
    totalVehicles: vehicles.length,
    canGoPrevious: currentPage > 0,
    canGoNext: endIndex < vehicles.length,
  }
}

export function getServerGaragePageModel({
  vehicles = [],
  page = {},
} = {}) {
  const visibleVehicles = Array.isArray(vehicles) ? vehicles : []
  const limit = Math.max(1, Number(page.limit) || GARAGE_PAGE_SIZE)
  const totalVehicles = Math.max(
    visibleVehicles.length,
    Number(page.total) || visibleVehicles.length,
  )
  const currentPage = Math.max(0, Number(page.currentPage) || 0)
  const firstVisibleNumber = visibleVehicles.length
    ? currentPage * limit + 1
    : 0

  return {
    currentPage,
    totalPages: getGaragePageCount(totalVehicles, limit),
    visibleVehicles,
    firstVisibleNumber,
    lastVisibleNumber: visibleVehicles.length
      ? firstVisibleNumber + visibleVehicles.length - 1
      : 0,
    totalVehicles,
    canGoPrevious: currentPage > 0,
    canGoNext: Boolean(page.hasNext),
  }
}
