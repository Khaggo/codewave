const normalizeBusinessToken = (value, fallback = 'UNSET') => {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return normalizedValue || fallback
}

export function toggleBookingServiceId(selectedServiceIds = [], serviceId) {
  if (!serviceId) {
    return [...selectedServiceIds]
  }

  return selectedServiceIds.includes(serviceId)
    ? selectedServiceIds.filter((currentId) => currentId !== serviceId)
    : [...selectedServiceIds, serviceId]
}

export function getSelectedBookingServices(
  services = [],
  selectedServiceIds = [],
  { activeOnly = true } = {},
) {
  const selectedIds = new Set(selectedServiceIds)
  return services.filter(
    (service) =>
      selectedIds.has(service?.id) && (!activeOnly || service?.isActive !== false),
  )
}

export function getBookingReference(booking) {
  if (booking?.bookingReference) {
    return booking.bookingReference
  }

  const compactDate = String(booking?.scheduledDate ?? '').replace(/-/g, '')
  const plateToken = normalizeBusinessToken(booking?.plateNumber, 'PENDING')
  return compactDate ? `BK-${compactDate}-${plateToken}` : `BK-${plateToken}`
}

export function getBookingRequestedServiceNames(booking) {
  const serviceNames = (booking?.requestedServices ?? [])
    .map((requestedService) => requestedService?.service?.name)
    .filter(Boolean)

  return Array.from(new Set(serviceNames))
}
