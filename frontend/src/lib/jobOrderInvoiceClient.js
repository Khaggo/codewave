import { ApiError } from './authClient.js';
import {
  buildAuthorizedHeaders,
  requestJobOrderApi,
  trimOrUndefined,
} from './jobOrderClientTransport.js';
import { normalizeJobOrderForWorkbench } from './jobOrderWorkbenchNormalization.mjs';

const jobOrderInvoicePaymentMethodAliases = {
  cash: 'cash',
  bank_transfer: 'bank_transfer',
  banktransfer: 'bank_transfer',
  check: 'check',
  cheque: 'check',
  other: 'other',
};
const jobOrderInvoicePaymentMethods = ['cash', 'bank_transfer', 'check', 'other'];

export const normalizeJobOrderInvoicePaymentMethod = (value) => {
  if (typeof value !== 'string') return value;
  const token = value
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return jobOrderInvoicePaymentMethodAliases[token] ?? value;
};

export const requireJobOrderInvoicePaymentMethod = (value, path) => {
  const normalized = normalizeJobOrderInvoicePaymentMethod(value);
  if (!jobOrderInvoicePaymentMethods.includes(normalized)) {
    throw new ApiError('Choose cash, bank transfer, check, or other for manual invoice payment.', 400, {
      path,
    });
  }
  return normalized;
};

export const exportJobOrderInvoicePdf = async ({
  jobOrderId,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError(
      'Load a finalized job order before exporting the invoice PDF.',
      400,
      {
        path: '/api/job-orders/:id/invoice/pdf',
      },
    );
  }

  return requestJobOrderApi(`/api/job-orders/${jobOrderId}/invoice/pdf`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
    responseType: 'blob',
  });
};

export const recordJobOrderInvoicePayment = async ({
  jobOrderId,
  amountPaid,
  paymentMethod,
  reference,
  receivedAt,
  expectedUpdatedAt,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError(
      'Load a finalized job order before recording invoice payment.',
      400,
      {
        path: '/api/job-orders/:id/invoice/payments',
      },
    );
  }

  const normalizedAmount = Number(amountPaid);
  const normalizedReceivedAt = trimOrUndefined(receivedAt);
  const normalizedPaymentMethod = requireJobOrderInvoicePaymentMethod(
    paymentMethod,
    '/api/job-orders/:id/invoice/payments',
  );

  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
    throw new ApiError('Enter a positive payment amount in pesos.', 400, {
      path: '/api/job-orders/:id/invoice/payments',
    });
  }

  return normalizeJobOrderForWorkbench(
    await requestJobOrderApi(
      `/api/job-orders/${jobOrderId}/invoice/payments`,
      {
        method: 'POST',
        headers: buildAuthorizedHeaders(accessToken),
        body: {
          amountPaidCents: normalizedAmount * 100,
          paymentMethod: normalizedPaymentMethod,
          reference: trimOrUndefined(reference),
          receivedAt: normalizedReceivedAt
            ? new Date(normalizedReceivedAt).toISOString()
            : undefined,
          expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
        },
      },
    ),
  );
};

export const getJobOrderInvoiceLookup = async ({
  jobOrderId,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError(
      'Enter or select a finalized job-order id before loading invoice detail.',
      400,
      {
        path: '/api/job-orders/:id/invoice-record',
      },
    );
  }

  let snapshot = null;

  try {
    snapshot = await requestJobOrderApi(
      `/api/job-orders/${jobOrderId}/invoice-record`,
      {
        method: 'GET',
        headers: buildAuthorizedHeaders(accessToken),
      },
    );
  } catch (error) {
    const routeUnavailable = error instanceof ApiError && error.status === 404;

    if (!routeUnavailable) {
      throw error;
    }

    snapshot = await requestJobOrderApi(`/api/job-orders/${jobOrderId}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    });
  }

  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return {
    ...snapshot,
    invoiceRecord:
      snapshot.invoiceRecord ??
      snapshot.invoice_record ??
      null,
  };
};

export const startJobOrderInvoicePaymongoCheckout = async ({
  jobOrderId,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError(
      'Load a finalized job order before starting PayMongo checkout.',
      400,
      {
        path: '/api/job-orders/:id/invoice/paymongo/checkout',
      },
    );
  }

  return normalizeJobOrderForWorkbench(
    await requestJobOrderApi(
      `/api/job-orders/${jobOrderId}/invoice/paymongo/checkout`,
      {
        method: 'POST',
        headers: buildAuthorizedHeaders(accessToken),
      },
    ),
  );
};

export const reconcileJobOrderInvoicePaymongoCheckout = async ({
  jobOrderId,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError(
      'Load a finalized job order before refreshing PayMongo checkout.',
      400,
      {
        path: '/api/job-orders/:id/invoice/paymongo/reconcile',
      },
    );
  }

  return normalizeJobOrderForWorkbench(
    await requestJobOrderApi(
      `/api/job-orders/${jobOrderId}/invoice/paymongo/reconcile`,
      {
        method: 'POST',
        headers: buildAuthorizedHeaders(accessToken),
      },
    ),
  );
};
