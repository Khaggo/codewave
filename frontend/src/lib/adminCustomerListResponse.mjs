const invalidCustomerListResponse = () =>
  new TypeError('Customer search returned an invalid response. Please retry.')

export const normalizeAdminCustomerListResponse = (
  response,
  { paged = false, normalizeItem = (item) => item } = {},
) => {
  const payload = response?.data ?? response
  let rawItems
  let pagination = null

  if (Array.isArray(payload)) {
    rawItems = payload
  } else if (payload && typeof payload === 'object' && Array.isArray(payload.items)) {
    rawItems = payload.items
    pagination = payload.pageInfo ?? payload.pagination ?? null
  } else {
    throw invalidCustomerListResponse()
  }

  const nextCursor = pagination?.nextCursor ?? payload?.nextCursor ?? null
  const hasMore = typeof pagination?.hasMore === 'boolean'
    ? pagination.hasMore
    : typeof payload?.hasMore === 'boolean'
      ? payload.hasMore
      : Boolean(nextCursor)
  const normalized = {
    items: rawItems.map(normalizeItem),
    pageInfo: {
      nextCursor: typeof nextCursor === 'string' && nextCursor ? nextCursor : null,
      hasMore,
    },
  }

  return paged ? normalized : normalized.items
}

export const canApplyAdminCustomerSearchResult = ({
  aborted = false,
  requestSequence,
  currentRequestSequence,
}) => !aborted && requestSequence === currentRequestSequence
