export function groupBookingServices(categories, services) {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]))
  const groups = new Map()

  services.forEach((service) => {
    const groupKey = service.categoryId || 'uncategorized'
    const groupLabel = service.categoryId ? categoryMap.get(service.categoryId) || 'Unknown category' : 'Uncategorized'
    const nextGroup = groups.get(groupKey) ?? { key: groupKey, label: groupLabel, services: [] }
    nextGroup.services.push(service)
    groups.set(groupKey, nextGroup)
  })

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label))
}

export const DEFAULT_BOOKING_SERVICE_LIST_QUERY = Object.freeze({
  search: '',
  status: 'all',
  categoryId: '',
  page: 1,
})

export function createDefaultBookingServiceListQuery() {
  return { ...DEFAULT_BOOKING_SERVICE_LIST_QUERY }
}

export function getBookingServiceListPresentation({ requestStatus, itemCount, query }) {
  const hasActiveFilters = Boolean(
    String(query?.search ?? '').trim() ||
      (query?.status && query.status !== 'all') ||
      query?.categoryId,
  )
  const isLoaded = requestStatus === 'success'

  return {
    hasActiveFilters,
    showStableList: isLoaded || requestStatus === 'loading',
    isFilteredEmpty: isLoaded && itemCount === 0 && hasActiveFilters,
    isCatalogEmpty: isLoaded && itemCount === 0 && !hasActiveFilters,
  }
}

export function getBookingServicePager({ page, totalPages, requestStatus }) {
  const normalizedTotalPages = Math.max(1, Number(totalPages) || 1)
  const normalizedPage = Math.min(normalizedTotalPages, Math.max(1, Number(page) || 1))
  const isLoading = requestStatus === 'loading'

  return {
    page: normalizedPage,
    totalPages: normalizedTotalPages,
    previousDisabled: isLoading || normalizedPage <= 1,
    nextDisabled: isLoading || normalizedPage >= normalizedTotalPages,
  }
}
