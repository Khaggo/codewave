import { ApiError, notifyStaffSessionUnauthorized } from '@/lib/authClient'
import {
  isAccessoryCatalogRow,
  isAccessoryRefund,
  isAccessoryStaffOrder,
  isAccessoryStockRow,
  normalizeAccessoryAdminPage,
} from './accessoriesAdminModel.mjs'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const queryString = (values) => {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value))
  })
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export const createAccessoryAdminRequestKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `accessory-admin-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const formatAccessoryAdminMoney = (cents, currency = 'PHP') =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format((Number(cents) || 0) / 100)

async function request(path, { accessToken, body, headers, formData, ...options } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      ...options,
      signal: controller.signal,
      headers: {
        ...(formData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(headers ?? {}),
      },
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    })
  } catch (error) {
    const message = controller.signal.aborted
      ? 'The Accessories request timed out. Try again.'
      : 'Accessories could not reach the shop service. Check your connection and try again.'
    throw new ApiError(message, 0, { code: 'ACCESSORIES_NETWORK_UNAVAILABLE' })
  } finally {
    clearTimeout(timeout)
  }
  const raw = await response.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
  if (!response.ok) {
    if (response.status === 401) notifyStaffSessionUnauthorized({ path, source: 'accessoriesAdminClient' })
    const message = typeof data?.message === 'string' ? data.message : `Accessories request failed with status ${response.status}.`
    throw new ApiError(message, response.status, data)
  }
  return data
}

const boundedPageRequest = async (promise, limit, isValidItem) =>
  normalizeAccessoryAdminPage(await promise, limit, isValidItem)

export const listAccessoryAdminProducts = ({ accessToken, cursor, search, categoryId, limit = 25 }) =>
  boundedPageRequest(request(`/api/admin/accessories/catalog/products${queryString({ cursor, search, categoryId, limit: Math.min(limit, 25) })}`, { accessToken }), limit, isAccessoryCatalogRow)
export const listAccessoryAdminCategories = ({ accessToken }) => request('/api/admin/accessories/catalog/categories', { accessToken })
export const getAccessoryAdminProduct = ({ accessToken, slug }) => request(`/api/admin/accessories/catalog/products/${encodeURIComponent(slug)}`, { accessToken })
export const createAccessoryCategory = ({ accessToken, payload }) => request('/api/admin/accessories/catalog/categories', { method: 'POST', accessToken, body: payload })
export const createAccessoryProduct = ({ accessToken, payload }) => request('/api/admin/accessories/catalog/products', { method: 'POST', accessToken, body: payload })
export const createAccessoryVariant = ({ accessToken, payload }) => request('/api/admin/accessories/catalog/variants', { method: 'POST', accessToken, body: payload })
export const updateAccessoryVariant = ({ accessToken, variantId, version, payload }) => request(`/api/admin/accessories/catalog/variants/${variantId}`, { method: 'PATCH', accessToken, headers: { 'If-Match': String(version) }, body: payload })
export const createAccessoryFitment = ({ accessToken, payload }) => request('/api/admin/accessories/fitments', { method: 'POST', accessToken, body: payload })
export const reviewAccessoryLighting = ({ accessToken, productId, payload }) => request(`/api/admin/accessories/catalog/products/${productId}/lighting-review`, { method: 'POST', accessToken, body: payload })
export const publishAccessoryProduct = ({ accessToken, productId, version, payload }) => request(`/api/admin/accessories/catalog/products/${productId}/status`, { method: 'PATCH', accessToken, headers: { 'If-Match': String(version) }, body: payload })
export const uploadAccessoryMedia = ({ accessToken, productId, altText, displayOrder, file }) => {
  const formData = new FormData()
  formData.append('productId', productId)
  formData.append('altText', altText)
  formData.append('displayOrder', String(displayOrder))
  formData.append('file', file)
  return request('/api/admin/accessories/media', { method: 'POST', accessToken, formData })
}
export const adjustAccessoryStock = ({ accessToken, payload, idempotencyKey }) => request('/api/admin/accessories/stock/adjustments', { method: 'POST', accessToken, headers: { 'Idempotency-Key': idempotencyKey }, body: payload })
export const listAccessoryStock = ({ accessToken, cursor, limit = 25 }) => boundedPageRequest(request(`/api/admin/accessories/stock${queryString({ cursor, limit: Math.min(limit, 25) })}`, { accessToken }), limit, isAccessoryStockRow)
export const listAccessoryStaffOrders = ({ accessToken, cursor, limit = 25 }) => boundedPageRequest(request(`/api/admin/accessories/orders${queryString({ cursor, limit: Math.min(limit, 25) })}`, { accessToken }), limit, isAccessoryStaffOrder)
export const getAccessoryStaffOrder = ({ accessToken, orderId }) => request(`/api/admin/accessories/orders/${orderId}`, { accessToken })
export const takeAccessoryOrder = ({ accessToken, orderId, version }) => request(`/api/admin/accessories/orders/${orderId}/take`, { method: 'POST', accessToken, headers: { 'If-Match': String(version) } })
export const reassignAccessoryOrder = ({ accessToken, orderId, version, payload }) => request(`/api/admin/accessories/orders/${orderId}/reassign`, { method: 'POST', accessToken, headers: { 'If-Match': String(version) }, body: payload })
export const cancelAccessoryStaffOrder = ({ accessToken, orderId, reason, idempotencyKey }) => request(`/api/admin/accessories/orders/${orderId}/cancel`, { method: 'POST', accessToken, headers: { 'Idempotency-Key': idempotencyKey }, body: { reason } })
export const transitionAccessoryOrder = ({ accessToken, orderId, version, payload }) => request(`/api/admin/accessories/orders/${orderId}/status`, { method: 'PATCH', accessToken, headers: { 'If-Match': String(version) }, body: payload })
export const listAccessoryRefunds = ({ accessToken, cursor, limit = 25 }) => boundedPageRequest(request(`/api/admin/accessories/refunds${queryString({ cursor, limit: Math.min(limit, 25) })}`, { accessToken }), limit, isAccessoryRefund)
export const approveAccessoryRefund = ({ accessToken, refundId, reason, idempotencyKey }) => request(`/api/admin/accessories/refunds/${refundId}/approve`, { method: 'POST', accessToken, headers: { 'Idempotency-Key': idempotencyKey }, body: { reason } })
