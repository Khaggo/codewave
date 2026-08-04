import { getApiBaseUrl } from './authClient.js';
import { buildAuthHeaders, request as transportRequest } from './insuranceTransport.js';

const request = async (...args) => {
  try {
    return await transportRequest(...args);
  } catch (error) {
    if (Number(error?.status) !== 0) throw error;
    const friendlyError = new Error(
      'Accessories could not connect to the shop right now. Check your connection and try again.',
    );
    friendlyError.status = 0;
    friendlyError.data = error?.data;
    throw friendlyError;
  }
};

const withToken = (accessToken, headers = {}) => ({
  ...(buildAuthHeaders(accessToken) ?? {}),
  ...headers,
});

const queryString = (values) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value));
    }
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};

export const createAccessoryRequestKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `accessory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const formatAccessoryMoney = (cents, currency = 'PHP') =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);

export const getAccessoryMediaSource = (mediaId, accessToken) => ({
  uri: `${getApiBaseUrl()}/api/accessories/media/${encodeURIComponent(mediaId)}`,
  headers: withToken(accessToken),
});

export const getAccessoryCapabilities = ({ accessToken, signal } = {}) =>
  request('/api/accessories/capabilities', {
    headers: withToken(accessToken),
    signal,
  });

export const listAccessoryCategories = ({ accessToken, signal } = {}) =>
  request('/api/accessories/categories', {
    headers: withToken(accessToken),
    signal,
  });

export const listAccessoryProducts = ({
  accessToken,
  cursor,
  limit = 20,
  search,
  categoryId,
  signal,
} = {}) =>
  request(
    `/api/accessories/products${queryString({ cursor, limit: Math.min(limit, 25), search, categoryId })}`,
    { headers: withToken(accessToken), signal },
  );

export const getAccessoryProduct = ({ slug, accessToken, signal }) =>
  request(`/api/accessories/products/${encodeURIComponent(slug)}`, {
    headers: withToken(accessToken),
    signal,
  });

export const getAccessoryFitment = ({ variantId, vehicleId, accessToken, signal }) =>
  request(
    `/api/accessories/variants/${encodeURIComponent(variantId)}/fitment${queryString({ vehicleId })}`,
    { headers: withToken(accessToken), signal },
  );

export const getAccessoryCart = ({ accessToken, signal } = {}) =>
  request('/api/accessories/cart', {
    headers: withToken(accessToken),
    signal,
  });

export const replaceAccessoryCart = ({ accessToken, version, selectedVehicleId, items }) =>
  request('/api/accessories/cart', {
    method: 'PUT',
    headers: withToken(accessToken, version ? { 'If-Match': String(version) } : {}),
    body: { selectedVehicleId: selectedVehicleId || null, items },
  });

export const patchAccessoryCartItem = ({ accessToken, version, variantId, quantity }) =>
  request('/api/accessories/cart', {
    method: 'PATCH',
    headers: withToken(accessToken, version ? { 'If-Match': String(version) } : {}),
    body: { variantId, quantity },
  });

export const deleteAccessoryCartItem = ({ accessToken, version, variantId }) =>
  request(`/api/accessories/cart${queryString({ variantId })}`, {
    method: 'DELETE',
    headers: withToken(accessToken, version ? { 'If-Match': String(version) } : {}),
  });

export const previewAccessoryCheckout = ({ accessToken, payload }) =>
  request('/api/accessories/checkouts/preview', {
    method: 'POST',
    headers: withToken(accessToken),
    body: payload,
  });

export const createAccessoryCheckout = ({ accessToken, idempotencyKey, payload }) =>
  request('/api/accessories/checkouts', {
    method: 'POST',
    headers: withToken(accessToken, { 'Idempotency-Key': idempotencyKey }),
    body: payload,
  });

export const listAccessoryOrders = ({ accessToken, cursor, limit = 20, signal } = {}) =>
  request(`/api/accessories/orders/mine${queryString({ cursor, limit: Math.min(limit, 25) })}`, {
    headers: withToken(accessToken),
    signal,
  });

export const getAccessoryOrder = ({ orderId, accessToken, signal }) =>
  request(`/api/accessories/orders/${encodeURIComponent(orderId)}`, {
    headers: withToken(accessToken),
    signal,
  });

export const cancelAccessoryOrder = ({ orderId, reason, accessToken, idempotencyKey }) =>
  request(`/api/accessories/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: withToken(accessToken, { 'Idempotency-Key': idempotencyKey }),
    body: { reason },
  });

export const retryAccessoryPayment = ({ orderId, accessToken, idempotencyKey }) =>
  request(`/api/accessories/orders/${encodeURIComponent(orderId)}/payment/retry`, {
    method: 'POST',
    headers: withToken(accessToken, { 'Idempotency-Key': idempotencyKey }),
  });

export const regenerateAccessoryPickupCode = ({ orderId, accessToken }) =>
  request(`/api/accessories/orders/${encodeURIComponent(orderId)}/pickup-code/regenerate`, {
    method: 'POST',
    headers: withToken(accessToken),
  });
