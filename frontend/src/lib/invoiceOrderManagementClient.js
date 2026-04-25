import { ApiError } from './authClient';

const DEFAULT_ECOMMERCE_API_BASE_URL = 'http://127.0.0.1:3001';
const REQUEST_TIMEOUT_MS = 8000;
const MAIN_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);

const deriveEcommerceApiBaseUrl = () => {
  const explicitBaseUrl = String(process.env.NEXT_PUBLIC_ECOMMERCE_API_BASE_URL ?? '').trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  try {
    const parsedBaseUrl = new URL(MAIN_API_BASE_URL);
    parsedBaseUrl.port = '3001';
    return parsedBaseUrl.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_ECOMMERCE_API_BASE_URL;
  }
};

const ECOMMERCE_API_BASE_URL = deriveEcommerceApiBaseUrl();

const buildAuthorizedHeaders = (accessToken) =>
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
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatLabel = (value, fallback = 'Unknown') => {
  const normalizedValue = trimOrNull(value);

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const formatInvoiceOrderCurrency = (amountCents) => {
  const amount = toNumber(amountCents) / 100;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const request = async (path, { accessToken, method = 'GET', body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) => {
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
        method,
        cache: 'no-store',
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(buildAuthorizedHeaders(accessToken) ?? {}),
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
                  `Timed out reaching ${ECOMMERCE_API_BASE_URL}${path} after ${timeoutMs}ms. Start ecommerce-service on port 3001 or set NEXT_PUBLIC_ECOMMERCE_API_BASE_URL.`,
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

    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the ecommerce order surface.';

    throw new ApiError(
      `Unable to reach ${ECOMMERCE_API_BASE_URL}${path}. Start ecommerce-service on port 3001 or set NEXT_PUBLIC_ECOMMERCE_API_BASE_URL. ${message}`,
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

const normalizePaymentEntry = (entry) => {
  const id = trimOrNull(entry?.id);

  if (!id) {
    return null;
  }

  const amountCents = toNumber(entry.amountCents);

  return {
    id,
    invoiceId: trimOrNull(entry.invoiceId),
    amountCents,
    amountLabel: formatInvoiceOrderCurrency(amountCents),
    paymentMethod: trimOrNull(entry.paymentMethod) ?? 'other',
    paymentMethodLabel: formatLabel(entry.paymentMethod, 'Manual Entry'),
    reference: trimOrNull(entry.reference),
    notes: trimOrNull(entry.notes),
    receivedAt: trimOrNull(entry.receivedAt),
    createdAt: trimOrNull(entry.createdAt),
  };
};

const normalizeInvoice = (invoice) => {
  const id = trimOrNull(invoice?.id);
  const orderId = trimOrNull(invoice?.orderId);
  const customerUserId = trimOrNull(invoice?.customerUserId);
  const invoiceNumber = trimOrNull(invoice?.invoiceNumber);

  if (!id || !orderId || !customerUserId || !invoiceNumber) {
    return null;
  }

  const totalCents = toNumber(invoice.totalCents);
  const amountPaidCents = toNumber(invoice.amountPaidCents);
  const amountDueCents = toNumber(invoice.amountDueCents);
  const status = trimOrNull(invoice.status) ?? 'pending_payment';
  const agingBucket = trimOrNull(invoice.agingBucket) ?? 'current';

  return {
    id,
    orderId,
    customerUserId,
    invoiceNumber,
    status,
    statusLabel: formatLabel(status, 'Pending Payment'),
    currencyCode: trimOrNull(invoice.currencyCode) ?? 'PHP',
    totalCents,
    totalLabel: formatInvoiceOrderCurrency(totalCents),
    amountPaidCents,
    amountPaidLabel: formatInvoiceOrderCurrency(amountPaidCents),
    amountDueCents,
    amountDueLabel: formatInvoiceOrderCurrency(amountDueCents),
    agingBucket,
    agingBucketLabel: formatLabel(agingBucket, 'Current'),
    daysPastDue: toNumber(invoice.daysPastDue),
    paymentEntries: Array.isArray(invoice.paymentEntries)
      ? invoice.paymentEntries.map(normalizePaymentEntry).filter(Boolean)
      : [],
    issuedAt: trimOrNull(invoice.issuedAt),
    dueAt: trimOrNull(invoice.dueAt),
    createdAt: trimOrNull(invoice.createdAt),
    updatedAt: trimOrNull(invoice.updatedAt),
  };
};

const normalizeOrder = (order) => {
  const id = trimOrNull(order?.id);
  const orderNumber = trimOrNull(order?.orderNumber);
  const customerUserId = trimOrNull(order?.customerUserId);

  if (!id || !orderNumber || !customerUserId) {
    return null;
  }

  const subtotalCents = toNumber(order.subtotalCents);

  return {
    id,
    orderNumber,
    customerUserId,
    checkoutMode: trimOrNull(order.checkoutMode) ?? 'invoice',
    status: trimOrNull(order.status) ?? 'invoice_pending',
    statusLabel: formatLabel(order.status, 'Invoice Pending'),
    subtotalCents,
    subtotalLabel: formatInvoiceOrderCurrency(subtotalCents),
    notes: trimOrNull(order.notes),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: trimOrNull(item?.id),
          productId: trimOrNull(item?.productId),
          productName: trimOrNull(item?.productName) ?? 'Product',
          sku: trimOrNull(item?.sku),
          quantity: toNumber(item?.quantity),
          unitPriceLabel: formatInvoiceOrderCurrency(item?.unitPriceCents),
          lineTotalLabel: formatInvoiceOrderCurrency(item?.lineTotalCents),
        })).filter((item) => item.id)
      : [],
    addresses: Array.isArray(order.addresses) ? order.addresses : [],
    invoice: order.invoice
      ? {
          id: trimOrNull(order.invoice.id),
          invoiceNumber: trimOrNull(order.invoice.invoiceNumber),
          status: trimOrNull(order.invoice.status),
          statusLabel: formatLabel(order.invoice.status, 'Pending Payment'),
          totalLabel: formatInvoiceOrderCurrency(order.invoice.totalCents),
          amountDueLabel: formatInvoiceOrderCurrency(order.invoice.amountDueCents),
        }
      : null,
    statusHistory: Array.isArray(order.statusHistory)
      ? order.statusHistory.map((entry) => ({
          ...entry,
          nextStatusLabel: formatLabel(entry?.nextStatus, 'Order Update'),
          previousStatusLabel: entry?.previousStatus ? formatLabel(entry.previousStatus) : null,
          transitionTypeLabel: formatLabel(entry?.transitionType, 'Timeline Update'),
        }))
      : [],
    createdAt: trimOrNull(order.createdAt),
    updatedAt: trimOrNull(order.updatedAt),
  };
};

export const getEcommerceInvoiceOrderApiBaseUrl = () => ECOMMERCE_API_BASE_URL;

export const getStaffEcommerceOrderDetail = async ({ orderId, accessToken } = {}) => {
  const normalizedOrderId = String(orderId ?? '').trim();

  if (!normalizedOrderId) {
    throw new ApiError('Enter an ecommerce order id before loading order detail.', 400, {
      path: '/api/orders/:id',
      orderId,
    });
  }

  const order = normalizeOrder(
    await request(`/api/orders/${encodeURIComponent(normalizedOrderId)}`, {
      accessToken,
    }),
  );

  if (!order) {
    throw new ApiError('The order-detail payload was missing required fields.', 500, {
      path: '/api/orders/:id',
      orderId: normalizedOrderId,
    });
  }

  return order;
};

export const getStaffEcommerceOrderInvoice = async ({ orderId, accessToken } = {}) => {
  const normalizedOrderId = String(orderId ?? '').trim();

  if (!normalizedOrderId) {
    throw new ApiError('Enter an ecommerce order id before loading invoice tracking.', 400, {
      path: '/api/orders/:id/invoice',
      orderId,
    });
  }

  const invoice = normalizeInvoice(
    await request(`/api/orders/${encodeURIComponent(normalizedOrderId)}/invoice`, {
      accessToken,
    }),
  );

  if (!invoice) {
    throw new ApiError('The invoice-detail payload was missing required fields.', 500, {
      path: '/api/orders/:id/invoice',
      orderId: normalizedOrderId,
    });
  }

  return invoice;
};

export const loadStaffEcommerceOrderSnapshot = async ({ orderId, accessToken } = {}) => {
  const [orderResult, invoiceResult] = await Promise.allSettled([
    getStaffEcommerceOrderDetail({ orderId, accessToken }),
    getStaffEcommerceOrderInvoice({ orderId, accessToken }),
  ]);

  if (orderResult.status === 'rejected') {
    throw orderResult.reason;
  }

  return {
    order: orderResult.value,
    invoice: invoiceResult.status === 'fulfilled' ? invoiceResult.value : null,
    invoiceError:
      invoiceResult.status === 'rejected'
        ? invoiceResult.reason?.message ?? 'Invoice tracking could not be loaded for this order.'
        : '',
    apiBaseUrl: ECOMMERCE_API_BASE_URL,
  };
};
