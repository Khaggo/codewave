export const MAX_ACCESSORY_PAGE_SIZE = 25;

export const isAccessoryOrderingEnabled = (capabilities) => capabilities?.orderingEnabled === true;

const isObject = (value) => Boolean(value) && typeof value === 'object';

export function normalizeAccessoryPage(
  page,
  requestedLimit = 20,
  isValidItem = isObject,
) {
  const limit = Math.max(1, Math.min(MAX_ACCESSORY_PAGE_SIZE, Number(requestedLimit) || 20));
  return {
    items: Array.isArray(page?.items)
      ? page.items.filter((item) => isObject(item) && isValidItem(item)).slice(0, limit)
      : [],
    nextCursor: typeof page?.nextCursor === 'string' && page.nextCursor ? page.nextCursor : null,
  };
}

export function normalizeAccessoryCart(cart) {
  if (!isObject(cart) || !Number.isInteger(Number(cart.version)) || !Array.isArray(cart.items)) {
    return null;
  }
  const items = cart.items.filter(
    (row) => row?.item?.id && row.item.variantId && row?.product?.id && row?.variant?.id,
  );
  return items.length === cart.items.length ? { ...cart, items } : null;
}

export function normalizeAccessoryProductDetail(detail) {
  if (!detail?.product?.id || !detail.product.slug || !Array.isArray(detail.variants)) return null;
  const variants = detail.variants.filter(
    (row) => row?.variant?.id && row.variant.productId && row.inventory,
  );
  if (!variants.length || variants.length !== detail.variants.length) return null;
  return {
    ...detail,
    variants,
    media: Array.isArray(detail.media) ? detail.media.filter(isObject) : [],
  };
}

export function normalizeAccessoryOrderDetail(detail) {
  if (!detail?.order?.id || !detail.order.orderReference) return null;
  return {
    ...detail,
    items: Array.isArray(detail.items)
      ? detail.items.filter((item) => item?.id && item.productName && item.variantName)
      : [],
    history: Array.isArray(detail.history)
      ? detail.history.filter((entry) => entry?.id && entry.nextStatus)
      : [],
    payments: Array.isArray(detail.payments) ? detail.payments.filter(isObject) : [],
    refunds: Array.isArray(detail.refunds) ? detail.refunds.filter(isObject) : [],
  };
}

export function canRetryAccessoryPayment(order) {
  return (
    order?.paymentMethod === 'paymongo' &&
    order?.status === 'pending_payment' &&
    ['pending', 'failed'].includes(order?.paymentStatus)
  );
}

export function validateAccessoryCheckoutContact(contact) {
  const errors = {};
  if (String(contact?.name ?? '').trim().length < 2) errors.name = 'Enter the pickup contact name.';
  if (!/^\+?[0-9 ()-]{7,24}$/.test(String(contact?.phone ?? '').trim())) {
    errors.phone = 'Enter a valid pickup phone number.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact?.email ?? '').trim())) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

export function normalizeCheckoutFitments(cart, loadedFitments = []) {
  const byVariantId = new Map(
    loadedFitments
      .filter((entry) => entry?.variantId)
      .map((entry) => [entry.variantId, entry]),
  );
  return (cart?.items ?? []).map((row) => {
    const variantId = row?.item?.variantId;
    return byVariantId.get(variantId) ?? { variantId, status: 'unverified' };
  });
}

export function getUnacknowledgedFitments(fitments, acknowledgements) {
  const acknowledged = new Set(acknowledgements ?? []);
  return (fitments ?? []).filter(
    (entry) => entry.status === 'unverified' && !acknowledged.has(entry.variantId),
  );
}

export function isAccessoryOrderCancellable(status) {
  return ![
    'preparing',
    'ready_for_pickup',
    'collected',
    'cancelled',
    'expired',
    'payment_exception',
    'refund_pending',
    'refunded',
  ].includes(status);
}
