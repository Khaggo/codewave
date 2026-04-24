import { ApiError } from './authClient';
import { getEcommerceApiBaseUrl } from './catalogClient';

const ECOMMERCE_API_BASE_URL = getEcommerceApiBaseUrl();
const CHECKOUT_REQUEST_TIMEOUT_MS = 8000;
const ORDER_CROSS_SERVICE_HINT =
  'Order history is direct ecommerce truth. Notifications and loyalty can refresh separately after downstream sync completes.';
const INVOICE_CROSS_SERVICE_HINT =
  'Invoice tracking is direct ecommerce truth. Notification reminder visibility may catch up after downstream sync.';

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const toNumber = (value) => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

export const formatEcommerceCurrency = (amountCents) => {
  const amount = toNumber(amountCents) / 100;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = CHECKOUT_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${ECOMMERCE_API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${ECOMMERCE_API_BASE_URL}${path} after ${timeoutMs}ms. Start ecommerce-service on port 3001 or set EXPO_PUBLIC_ECOMMERCE_API_BASE_URL.`,
                  0,
                  {
                    path,
                    apiBaseUrl: ECOMMERCE_API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the ecommerce API server.';

    throw new ApiError(
      `Unable to reach ${ECOMMERCE_API_BASE_URL}${path}. Start ecommerce-service on port 3001 or set EXPO_PUBLIC_ECOMMERCE_API_BASE_URL. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: ECOMMERCE_API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const requireCustomerUserId = (customerUserId, path) => {
  const normalizedCustomerUserId = String(customerUserId ?? '').trim();

  if (!normalizedCustomerUserId) {
    throw new ApiError('You need an active customer session before shop cart actions can run.', 401, {
      path,
      reason: 'missing_customer_user_id',
    });
  }

  return normalizedCustomerUserId;
};

const normalizeCartItem = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id = trimOrNull(item.id);
  const productId = trimOrNull(item.productId);

  if (!id || !productId) {
    return null;
  }

  const quantity = Math.max(0, toNumber(item.quantity));
  const unitPriceCents = toNumber(item.unitPriceCents);
  const lineTotalCents = toNumber(item.lineTotalCents);

  return {
    id,
    key: id,
    productId,
    productName: trimOrNull(item.productName) ?? 'Catalog product',
    productSlug: trimOrNull(item.productSlug),
    productSku: trimOrNull(item.productSku),
    quantity,
    unitPriceCents,
    unitPriceAmount: unitPriceCents / 100,
    unitPriceLabel: formatEcommerceCurrency(unitPriceCents),
    lineTotalCents,
    lineTotalAmount: lineTotalCents / 100,
    lineTotalLabel: formatEcommerceCurrency(lineTotalCents),
    availabilityStatus: trimOrNull(item.availabilityStatus) ?? 'available',
    createdAt: trimOrNull(item.createdAt),
    updatedAt: trimOrNull(item.updatedAt),
  };
};

const normalizeCart = (cart) => {
  if (!cart || typeof cart !== 'object') {
    return null;
  }

  const id = trimOrNull(cart.id);
  const customerUserId = trimOrNull(cart.customerUserId);

  if (!id || !customerUserId) {
    return null;
  }

  const subtotalCents = toNumber(cart.subtotalCents);
  const items = Array.isArray(cart.items) ? cart.items.map(normalizeCartItem).filter(Boolean) : [];

  return {
    id,
    customerUserId,
    items,
    subtotalCents,
    subtotalAmount: subtotalCents / 100,
    subtotalLabel: formatEcommerceCurrency(subtotalCents),
    totalQuantity: toNumber(cart.totalQuantity),
    createdAt: trimOrNull(cart.createdAt),
    updatedAt: trimOrNull(cart.updatedAt),
  };
};

const normalizeCheckoutPreview = (preview) => {
  if (!preview || typeof preview !== 'object') {
    return null;
  }

  const cartId = trimOrNull(preview.cartId);
  const customerUserId = trimOrNull(preview.customerUserId);

  if (!cartId || !customerUserId) {
    return null;
  }

  const subtotalCents = toNumber(preview.subtotalCents);
  const items = Array.isArray(preview.items)
    ? preview.items.map(normalizeCartItem).filter(Boolean)
    : [];

  return {
    cartId,
    customerUserId,
    checkoutMode: trimOrNull(preview.checkoutMode) ?? 'invoice',
    items,
    subtotalCents,
    subtotalAmount: subtotalCents / 100,
    subtotalLabel: formatEcommerceCurrency(subtotalCents),
    totalQuantity: toNumber(preview.totalQuantity),
  };
};

const formatOrderStatusLabel = (status) => {
  switch (status) {
    case 'invoice_pending':
      return 'Awaiting invoice payment';
    case 'awaiting_fulfillment':
      return 'Awaiting fulfillment';
    case 'fulfilled':
      return 'Fulfilled';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Order created';
  }
};

const formatInvoiceStatusLabel = (status) => {
  switch (status) {
    case 'pending_payment':
      return 'Pending payment';
    case 'partially_paid':
      return 'Partially paid';
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Invoice issued';
  }
};

const formatInvoiceAgingBucketLabel = (agingBucket) => {
  switch (agingBucket) {
    case 'current':
      return 'Current';
    case 'overdue_1_7':
      return 'Overdue 1-7 days';
    case 'overdue_8_30':
      return 'Overdue 8-30 days';
    case 'overdue_31_plus':
      return 'Overdue 31+ days';
    case 'settled':
      return 'Settled';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Tracking';
  }
};

const formatInvoicePaymentMethodLabel = (paymentMethod) => {
  switch (paymentMethod) {
    case 'cash':
      return 'Cash';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'check':
      return 'Check';
    case 'other':
      return 'Other';
    default:
      return 'Manual entry';
  }
};

const formatOrderTransitionTypeLabel = (transitionType) => {
  switch (transitionType) {
    case 'checkout':
      return 'Checkout';
    case 'status_update':
      return 'Status update';
    case 'cancel':
      return 'Cancellation';
    default:
      return 'Timeline update';
  }
};

const buildInvoiceAgingSummary = ({ status, agingBucket, daysPastDue }) => {
  if (status === 'paid') {
    return 'Invoice settled in full.';
  }

  if (status === 'cancelled') {
    return 'Invoice tracking was cancelled.';
  }

  if (agingBucket === 'current') {
    return 'Invoice is still within the current tracking window.';
  }

  if (Number(daysPastDue) > 0) {
    return `Invoice is overdue by ${daysPastDue} day${daysPastDue === 1 ? '' : 's'}.`;
  }

  return 'Invoice aging is being tracked by the backend.';
};

const normalizeInvoice = (invoice) => {
  if (!invoice || typeof invoice !== 'object') {
    return null;
  }

  const id = trimOrNull(invoice.id);
  const orderId = trimOrNull(invoice.orderId);
  const customerUserId = trimOrNull(invoice.customerUserId);
  const invoiceNumber = trimOrNull(invoice.invoiceNumber);

  if (!id || !orderId || !customerUserId || !invoiceNumber) {
    return null;
  }

  const totalCents = toNumber(invoice.totalCents);
  const amountPaidCents = toNumber(invoice.amountPaidCents);
  const amountDueCents = toNumber(invoice.amountDueCents);
  const daysPastDue = toNumber(invoice.daysPastDue);
  const status = trimOrNull(invoice.status) ?? 'pending_payment';
  const agingBucket = trimOrNull(invoice.agingBucket) ?? 'current';

  return {
    id,
    orderId,
    customerUserId,
    invoiceNumber,
    status,
    statusLabel: formatInvoiceStatusLabel(status),
    currencyCode: trimOrNull(invoice.currencyCode) ?? 'PHP',
    totalCents,
    totalAmount: totalCents / 100,
    totalLabel: formatEcommerceCurrency(totalCents),
    amountPaidCents,
    amountPaidAmount: amountPaidCents / 100,
    amountPaidLabel: formatEcommerceCurrency(amountPaidCents),
    amountDueCents,
    amountDueAmount: amountDueCents / 100,
    amountDueLabel: formatEcommerceCurrency(amountDueCents),
    agingBucket,
    agingBucketLabel: formatInvoiceAgingBucketLabel(agingBucket),
    daysPastDue,
    agingSummary: buildInvoiceAgingSummary({
      status,
      agingBucket,
      daysPastDue,
    }),
    paymentEntries: Array.isArray(invoice.paymentEntries)
      ? invoice.paymentEntries
          .map((paymentEntry) => {
            const paymentEntryId = trimOrNull(paymentEntry?.id);

            if (!paymentEntryId) {
              return null;
            }

            const amountCents = toNumber(paymentEntry.amountCents);

            return {
              id: paymentEntryId,
              invoiceId: trimOrNull(paymentEntry.invoiceId),
              amountCents,
              amountAmount: amountCents / 100,
              amountLabel: formatEcommerceCurrency(amountCents),
              paymentMethod: trimOrNull(paymentEntry.paymentMethod) ?? 'other',
              paymentMethodLabel: formatInvoicePaymentMethodLabel(paymentEntry.paymentMethod),
              reference: trimOrNull(paymentEntry.reference),
              notes: trimOrNull(paymentEntry.notes),
              receivedAt: trimOrNull(paymentEntry.receivedAt),
              createdAt: trimOrNull(paymentEntry.createdAt),
            };
          })
          .filter(Boolean)
      : [],
    issuedAt: trimOrNull(invoice.issuedAt),
    dueAt: trimOrNull(invoice.dueAt),
    createdAt: trimOrNull(invoice.createdAt),
    updatedAt: trimOrNull(invoice.updatedAt),
    ownerDomain: 'ecommerce.invoice-payments',
    consistencyModel: 'owner_route_truth',
    crossServiceHint: INVOICE_CROSS_SERVICE_HINT,
  };
};

const normalizeOrder = (order) => {
  if (!order || typeof order !== 'object') {
    return null;
  }

  const id = trimOrNull(order.id);
  const orderNumber = trimOrNull(order.orderNumber);
  const customerUserId = trimOrNull(order.customerUserId);

  if (!id || !orderNumber || !customerUserId) {
    return null;
  }

  const subtotalCents = toNumber(order.subtotalCents);
  const items = Array.isArray(order.items)
    ? order.items
        .map((item) =>
          normalizeCartItem({
            ...item,
            productSku: item.sku,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
            availabilityStatus: 'available',
          }),
        )
        .filter(Boolean)
    : [];

  return {
    id,
    orderNumber,
    customerUserId,
    checkoutMode: trimOrNull(order.checkoutMode) ?? 'invoice',
    status: trimOrNull(order.status) ?? 'invoice_pending',
    statusLabel: formatOrderStatusLabel(order.status),
    subtotalCents,
    subtotalAmount: subtotalCents / 100,
    subtotalLabel: formatEcommerceCurrency(subtotalCents),
    notes: trimOrNull(order.notes),
    items,
    addresses: Array.isArray(order.addresses)
      ? order.addresses
          .map((address) => {
            const addressId = trimOrNull(address?.id);

            if (!addressId) {
              return null;
            }

            return {
              id: addressId,
              addressType: trimOrNull(address.addressType) ?? 'billing',
              recipientName: trimOrNull(address.recipientName),
              email: trimOrNull(address.email),
              contactPhone: trimOrNull(address.contactPhone),
              addressLine1: trimOrNull(address.addressLine1),
              addressLine2: trimOrNull(address.addressLine2),
              city: trimOrNull(address.city),
              province: trimOrNull(address.province),
              postalCode: trimOrNull(address.postalCode),
            };
          })
          .filter(Boolean)
      : [],
    invoice: order.invoice
      ? {
          id: trimOrNull(order.invoice.id),
          invoiceNumber: trimOrNull(order.invoice.invoiceNumber),
          status: trimOrNull(order.invoice.status),
          statusLabel: formatInvoiceStatusLabel(order.invoice.status),
          totalCents: toNumber(order.invoice.totalCents),
          totalLabel: formatEcommerceCurrency(order.invoice.totalCents),
          amountDueCents: toNumber(order.invoice.amountDueCents),
          amountDueLabel: formatEcommerceCurrency(order.invoice.amountDueCents),
        }
      : null,
    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory
          .map((historyEntry) => {
            const historyId = trimOrNull(historyEntry?.id);

            if (!historyId) {
              return null;
            }

            return {
              id: historyId,
              previousStatus: trimOrNull(historyEntry.previousStatus),
              previousStatusLabel: historyEntry.previousStatus
                ? formatOrderStatusLabel(historyEntry.previousStatus)
                : null,
              nextStatus: trimOrNull(historyEntry.nextStatus),
              nextStatusLabel: formatOrderStatusLabel(historyEntry.nextStatus),
              reason: trimOrNull(historyEntry.reason),
              transitionType: trimOrNull(historyEntry.transitionType),
              transitionTypeLabel: formatOrderTransitionTypeLabel(historyEntry.transitionType),
              changedAt: trimOrNull(historyEntry.changedAt),
            };
          })
          .filter(Boolean)
      : [],
    createdAt: trimOrNull(order.createdAt),
    updatedAt: trimOrNull(order.updatedAt),
    ownerDomain: 'ecommerce.orders',
    consistencyModel: 'owner_route_truth',
    crossServiceHint: ORDER_CROSS_SERVICE_HINT,
  };
};

export const createEmptyCustomerCartSnapshot = () => ({
  cart: null,
  items: [],
  subtotalCents: 0,
  subtotalAmount: 0,
  subtotalLabel: formatEcommerceCurrency(0),
  totalQuantity: 0,
});

export const createEmptyCustomerOrderHistorySnapshot = () => ({
  orders: [],
});

export const getCustomerCart = async ({ customerUserId, accessToken } = {}) => {
  const normalizedCustomerUserId = requireCustomerUserId(customerUserId, '/api/cart');
  const encodedCustomerUserId = encodeURIComponent(normalizedCustomerUserId);
  const data = await request(`/api/cart?customerUserId=${encodedCustomerUserId}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
  const normalizedCart = normalizeCart(data);

  if (!normalizedCart) {
    throw new ApiError('The cart payload was missing required fields.', 500, {
      customerUserId: normalizedCustomerUserId,
      path: '/api/cart',
      payload: data,
    });
  }

  return {
    cart: normalizedCart,
    items: normalizedCart.items,
    subtotalCents: normalizedCart.subtotalCents,
    subtotalAmount: normalizedCart.subtotalAmount,
    subtotalLabel: normalizedCart.subtotalLabel,
    totalQuantity: normalizedCart.totalQuantity,
  };
};

export const addCustomerCartItem = async ({
  customerUserId,
  productId,
  quantity = 1,
  accessToken,
} = {}) => {
  requireCustomerUserId(customerUserId, '/api/cart/items');

  return getCustomerCartFromResponse(
    await request('/api/cart/items', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: {
        customerUserId,
        productId,
        quantity,
      },
    }),
  );
};

const getCustomerCartFromResponse = (data) => {
  const normalizedCart = normalizeCart(data);

  if (!normalizedCart) {
    throw new ApiError('The cart response was missing required fields.', 500, {
      path: 'cart-response',
      payload: data,
    });
  }

  return {
    cart: normalizedCart,
    items: normalizedCart.items,
    subtotalCents: normalizedCart.subtotalCents,
    subtotalAmount: normalizedCart.subtotalAmount,
    subtotalLabel: normalizedCart.subtotalLabel,
    totalQuantity: normalizedCart.totalQuantity,
  };
};

export const updateCustomerCartItem = async ({
  itemId,
  customerUserId,
  quantity,
  accessToken,
} = {}) => {
  const normalizedCustomerUserId = requireCustomerUserId(customerUserId, '/api/cart/items/:itemId');
  const normalizedItemId = String(itemId ?? '').trim();

  if (!normalizedItemId) {
    throw new ApiError('Select a cart item before changing its quantity.', 400, {
      itemId,
      path: '/api/cart/items/:itemId',
    });
  }

  return getCustomerCartFromResponse(
    await request(`/api/cart/items/${encodeURIComponent(normalizedItemId)}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: {
        customerUserId: normalizedCustomerUserId,
        quantity,
      },
    }),
  );
};

export const removeCustomerCartItem = async ({
  itemId,
  customerUserId,
  accessToken,
} = {}) => {
  const normalizedCustomerUserId = requireCustomerUserId(customerUserId, '/api/cart/items/:itemId');
  const normalizedItemId = String(itemId ?? '').trim();

  if (!normalizedItemId) {
    throw new ApiError('Select a cart item before removing it.', 400, {
      itemId,
      path: '/api/cart/items/:itemId',
    });
  }

  return getCustomerCartFromResponse(
    await request(
      `/api/cart/items/${encodeURIComponent(normalizedItemId)}?customerUserId=${encodeURIComponent(normalizedCustomerUserId)}`,
      {
        method: 'DELETE',
        headers: buildAuthHeaders(accessToken),
      },
    ),
  );
};

export const loadCustomerCheckoutPreview = async ({ customerUserId, accessToken } = {}) => {
  requireCustomerUserId(customerUserId, '/api/cart/checkout-preview');

  const data = await request('/api/cart/checkout-preview', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: {
      customerUserId,
    },
  });
  const normalizedPreview = normalizeCheckoutPreview(data);

  if (!normalizedPreview) {
    throw new ApiError('The checkout preview payload was missing required fields.', 500, {
      customerUserId,
      path: '/api/cart/checkout-preview',
      payload: data,
    });
  }

  return normalizedPreview;
};

export const checkoutCustomerInvoice = async ({
  customerUserId,
  billingAddress,
  notes,
  accessToken,
} = {}) => {
  requireCustomerUserId(customerUserId, '/api/checkout/invoice');

  const data = await request('/api/checkout/invoice', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: {
      customerUserId,
      billingAddress,
      notes: trimOrNull(notes),
    },
  });
  const normalizedOrder = normalizeOrder(data);

  if (!normalizedOrder) {
    throw new ApiError('The checkout order payload was missing required fields.', 500, {
      customerUserId,
      path: '/api/checkout/invoice',
      payload: data,
    });
  }

  return normalizedOrder;
};

export const listCustomerOrders = async ({
  customerUserId,
  status,
  invoiceStatus,
  accessToken,
} = {}) => {
  const normalizedCustomerUserId = requireCustomerUserId(customerUserId, '/api/users/:id/orders');
  const query = new URLSearchParams();

  if (trimOrNull(status)) {
    query.set('status', trimOrNull(status));
  }

  if (trimOrNull(invoiceStatus)) {
    query.set('invoiceStatus', trimOrNull(invoiceStatus));
  }

  const querySuffix = query.size > 0 ? `?${query.toString()}` : '';
  const data = await request(`/api/users/${encodeURIComponent(normalizedCustomerUserId)}/orders${querySuffix}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
  const normalizedOrders = Array.isArray(data) ? data.map(normalizeOrder).filter(Boolean) : null;

  if (!normalizedOrders) {
    throw new ApiError('The order-history payload was missing required fields.', 500, {
      customerUserId: normalizedCustomerUserId,
      path: '/api/users/:id/orders',
      payload: data,
    });
  }

  return {
    orders: normalizedOrders,
  };
};

export const getCustomerOrderDetail = async ({ orderId, accessToken } = {}) => {
  const normalizedOrderId = String(orderId ?? '').trim();

  if (!normalizedOrderId) {
    throw new ApiError('Select an order before opening order tracking.', 400, {
      orderId,
      path: '/api/orders/:id',
    });
  }

  const data = await request(`/api/orders/${encodeURIComponent(normalizedOrderId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
  const normalizedOrder = normalizeOrder(data);

  if (!normalizedOrder) {
    throw new ApiError('The order-detail payload was missing required fields.', 500, {
      orderId: normalizedOrderId,
      path: '/api/orders/:id',
      payload: data,
    });
  }

  return normalizedOrder;
};

export const getCustomerOrderInvoice = async ({ orderId, accessToken } = {}) => {
  const normalizedOrderId = String(orderId ?? '').trim();

  if (!normalizedOrderId) {
    throw new ApiError('Select an order before opening invoice tracking.', 400, {
      orderId,
      path: '/api/orders/:id/invoice',
    });
  }

  const data = await request(`/api/orders/${encodeURIComponent(normalizedOrderId)}/invoice`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
  const normalizedInvoice = normalizeInvoice(data);

  if (!normalizedInvoice) {
    throw new ApiError('The invoice-tracking payload was missing required fields.', 500, {
      orderId: normalizedOrderId,
      path: '/api/orders/:id/invoice',
      payload: data,
    });
  }

  return normalizedInvoice;
};
