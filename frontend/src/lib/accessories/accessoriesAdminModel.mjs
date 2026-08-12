export const MAX_ACCESSORY_ADMIN_PAGE_SIZE = 25
export const ACCESSORY_CATALOG_DISABLED_CODE = 'ACCESSORY_CATALOG_DISABLED'
export const ACCESSORIES_NETWORK_UNAVAILABLE_CODE = 'ACCESSORIES_NETWORK_UNAVAILABLE'

const isObject = (value) => Boolean(value) && typeof value === 'object'

export function getAccessoryApiErrorCode(error) {
  const candidates = [
    error?.code,
    error?.details?.code,
    error?.details?.message?.code,
  ]
  return candidates.find((code) => typeof code === 'string' && code.trim()) ?? ''
}

export function getAccessoryCatalogViewState({ requestStatus, errorCode, errorStatus, itemCount = 0 } = {}) {
  if (requestStatus === 'loading') return 'loading'
  if (errorCode === ACCESSORY_CATALOG_DISABLED_CODE) return 'disabled'
  if (requestStatus === 'error' && [401, 403].includes(Number(errorStatus))) return 'unauthorized'
  if (requestStatus === 'error' && (errorCode === ACCESSORIES_NETWORK_UNAVAILABLE_CODE || Number(errorStatus) === 0)) return 'network-error'
  if (requestStatus === 'error') return 'error'
  if (Number(itemCount) === 0) return 'empty'
  return 'ready'
}

export function normalizeAccessoryAdminPage(
  page,
  requestedLimit = MAX_ACCESSORY_ADMIN_PAGE_SIZE,
  isValidItem = isObject,
) {
  const limit = Math.max(
    1,
    Math.min(MAX_ACCESSORY_ADMIN_PAGE_SIZE, Number(requestedLimit) || MAX_ACCESSORY_ADMIN_PAGE_SIZE),
  )
  return {
    items: Array.isArray(page?.items)
      ? page.items.filter((item) => isObject(item) && isValidItem(item)).slice(0, limit)
      : [],
    nextCursor: typeof page?.nextCursor === 'string' && page.nextCursor ? page.nextCursor : null,
  }
}

export const isAccessoryCatalogRow = (row) =>
  Boolean(row?.product?.id && row.product.slug && row?.category?.id)

export const isAccessoryStockRow = (row) =>
  Boolean(row?.product?.id && row?.variant?.id && row.variant.sku && row?.inventory)

export const isAccessoryStaffOrder = (order) =>
  Boolean(order?.id && order.orderReference && Number.isInteger(Number(order.version)))

export const isAccessoryRefund = (refund) => Boolean(refund?.id && refund.status)

export const normalizeAccessoryAdminCategories = (categories) =>
  Array.isArray(categories)
    ? categories.filter((category) => category?.id && category.name && category.slug)
    : []

export const getAccessoryOrderNextAction = (order, userId) => {
  if (!isAccessoryStaffOrder(order)) return null
  const claimable = ['reserved', 'paid', 'preparing', 'ready_for_pickup'].includes(order.status)
  if (!order.assignedToUserId) return claimable ? { key: 'take', label: 'Take order' } : null
  if (order.assignedToUserId !== userId) return null
  if (['reserved', 'paid'].includes(order.status)) return { key: 'preparing', label: 'Begin preparation' }
  if (order.status === 'preparing') return { key: 'ready_for_pickup', label: 'Mark ready for pickup' }
  if (order.status === 'ready_for_pickup') return { key: 'collected', label: 'Verify collection' }
  return null
}

export const normalizeAccessoryStaffOrderDetail = (detail) => {
  if (!isAccessoryStaffOrder(detail?.order)) return null
  return {
    ...detail,
    items: Array.isArray(detail.items)
      ? detail.items.filter((item) => item?.id && item.productNameSnapshot && item.variantNameSnapshot)
      : [],
    history: Array.isArray(detail.history)
      ? detail.history.filter((entry) => entry?.id && entry.nextStatus)
      : [],
  }
}

export const normalizeAccessoryAdminProductDetail = (detail) => {
  if (!detail?.product?.id || !detail.product.slug || !detail?.category?.id) return null
  const variants = Array.isArray(detail.variants)
    ? detail.variants.filter((row) => row?.variant?.id)
    : []
  return {
    ...detail,
    variants,
    media: Array.isArray(detail.media) ? detail.media.filter(isObject) : [],
    fitments: Array.isArray(detail.fitments) ? detail.fitments.filter(isObject) : [],
  }
}
