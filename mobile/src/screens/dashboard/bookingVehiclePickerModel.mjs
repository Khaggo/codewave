export const BOOKING_VEHICLE_PAGE_SIZE = 5

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function getBookingVehiclePageForSelection(
  vehicles,
  selectedVehicleId,
  pageSize = BOOKING_VEHICLE_PAGE_SIZE,
) {
  const selectedIndex = vehicles.findIndex((vehicle) => vehicle.id === selectedVehicleId)
  return selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : 0
}

export function buildBookingVehiclePickerPage({
  vehicles = [],
  search = '',
  page = 0,
  pageSize = BOOKING_VEHICLE_PAGE_SIZE,
} = {}) {
  const normalizedSearch = normalizeSearchText(search)
  const filteredVehicles = normalizedSearch
    ? vehicles.filter((vehicle) => (
        [vehicle.title, vehicle.subtitle, vehicle.plateNumber]
          .map(normalizeSearchText)
          .some((value) => value.includes(normalizedSearch))
      ))
    : vehicles
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1))
  const startIndex = currentPage * pageSize
  const items = filteredVehicles.slice(startIndex, startIndex + pageSize)

  return {
    currentPage,
    firstVisibleNumber: items.length ? startIndex + 1 : 0,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    items,
    lastVisibleNumber: items.length ? startIndex + items.length : 0,
    totalMatches: filteredVehicles.length,
    totalPages,
  }
}
