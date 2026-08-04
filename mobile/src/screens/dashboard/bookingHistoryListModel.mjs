import {
  getBookingReference,
  getBookingServiceHeadline,
  getBookingStatusLabel,
  getBookingVehicleLabel,
} from './bookingPresentationModel.mjs'

export const BOOKING_HISTORY_PAGE_SIZE = 10

function normalizeSearchText(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function buildBookingHistoryListPage({
  bookings = [],
  vehicles = [],
  search = '',
  page = 0,
  pageSize = BOOKING_HISTORY_PAGE_SIZE,
} = {}) {
  const normalizedSearch = normalizeSearchText(search)
  const filteredBookings = normalizedSearch
    ? bookings.filter((booking) => (
        [
          getBookingReference(booking),
          getBookingServiceHeadline(booking),
          getBookingStatusLabel(booking?.status),
          getBookingVehicleLabel(booking, vehicles),
        ]
          .map(normalizeSearchText)
          .some((value) => value.includes(normalizedSearch))
      ))
    : bookings
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const currentPage = Math.max(0, Math.min(Number(page) || 0, totalPages - 1))
  const startIndex = currentPage * pageSize
  const items = filteredBookings.slice(startIndex, startIndex + pageSize)

  return {
    currentPage,
    firstVisibleNumber: items.length ? startIndex + 1 : 0,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    items,
    lastVisibleNumber: items.length ? startIndex + items.length : 0,
    totalMatches: filteredBookings.length,
    totalPages,
  }
}
