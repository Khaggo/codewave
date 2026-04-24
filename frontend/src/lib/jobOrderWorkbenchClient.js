import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const trimOrUndefined = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : undefined;
};

const request = async (path, options = {}) => {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
};

const buildAuthorizedHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

export const normalizeJobOrderForWorkbench = (jobOrder) => {
  if (!jobOrder || typeof jobOrder !== 'object') {
    return null;
  }

  const items = Array.isArray(jobOrder.items) ? jobOrder.items : [];
  const assignments = Array.isArray(jobOrder.assignments) ? jobOrder.assignments : [];
  const progressEntries = Array.isArray(jobOrder.progressEntries) ? jobOrder.progressEntries : [];
  const photos = Array.isArray(jobOrder.photos) ? jobOrder.photos : [];

  return {
    ...jobOrder,
    items,
    assignments,
    progressEntries,
    photos,
    itemCount: items.length,
    completedItemCount: items.filter((item) => item?.isCompleted).length,
    assignedTechnicianIds: assignments
      .map((assignment) => assignment?.technicianUserId)
      .filter(Boolean),
    latestProgressEntry: progressEntries.length > 0 ? progressEntries[progressEntries.length - 1] : null,
    hasInvoiceRecord: Boolean(jobOrder.invoiceRecord),
  };
};

export const createJobOrderFromBooking = async ({
  accessToken,
  sourceId,
  customerUserId,
  vehicleId,
  serviceAdviserUserId,
  serviceAdviserCode,
  notes,
  items,
  assignedTechnicianIds,
}) => {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => ({
          name: String(item?.name ?? '').trim(),
          description: trimOrUndefined(item?.description),
          estimatedHours:
            typeof item?.estimatedHours === 'number' && Number.isFinite(item.estimatedHours)
              ? item.estimatedHours
              : undefined,
        }))
        .filter((item) => item.name)
    : [];

  if (!sourceId) {
    throw new ApiError('Select a confirmed booking before creating a job order.', 400, {
      path: '/api/job-orders',
    });
  }

  if (!serviceAdviserUserId || !serviceAdviserCode) {
    throw new ApiError('A valid adviser snapshot is required before creating a job order.', 400, {
      path: '/api/job-orders',
    });
  }

  if (normalizedItems.length === 0) {
    throw new ApiError('Add at least one work item before creating a job order.', 400, {
      path: '/api/job-orders',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request('/api/job-orders', {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        sourceType: 'booking',
        sourceId,
        customerUserId,
        vehicleId,
        serviceAdviserUserId,
        serviceAdviserCode,
        notes: trimOrUndefined(notes),
        items: normalizedItems,
        assignedTechnicianIds:
          Array.isArray(assignedTechnicianIds) && assignedTechnicianIds.length > 0
            ? assignedTechnicianIds
            : undefined,
      },
    }),
  );
};

export const getJobOrderById = async ({ jobOrderId, accessToken }) => {
  if (!jobOrderId) {
    throw new ApiError('Enter or select a job-order id before loading detail.', 400, {
      path: '/api/job-orders/:id',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const updateJobOrderStatus = async ({
  jobOrderId,
  status,
  reason,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before saving a status update.', 400, {
      path: '/api/job-orders/:id/status',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/status`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        status,
        reason: trimOrUndefined(reason),
      },
    }),
  );
};

export const addJobOrderProgressEntry = async ({
  jobOrderId,
  entryType,
  message,
  completedItemIds,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before appending progress.', 400, {
      path: '/api/job-orders/:id/progress',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/progress`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        entryType,
        message: String(message ?? '').trim(),
        completedItemIds:
          Array.isArray(completedItemIds) && completedItemIds.length > 0
            ? completedItemIds
            : undefined,
      },
    }),
  );
};

export const addJobOrderPhotoEvidence = async ({
  jobOrderId,
  fileName,
  fileUrl,
  caption,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before attaching photo evidence.', 400, {
      path: '/api/job-orders/:id/photos',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/photos`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        fileName: String(fileName ?? '').trim(),
        fileUrl: String(fileUrl ?? '').trim(),
        caption: trimOrUndefined(caption),
      },
    }),
  );
};

export const finalizeJobOrder = async ({
  jobOrderId,
  summary,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before finalizing invoice-ready work.', 400, {
      path: '/api/job-orders/:id/finalize',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/finalize`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        summary: trimOrUndefined(summary),
      },
    }),
  );
};

export const recordJobOrderInvoicePayment = async ({
  jobOrderId,
  amountPaidCents,
  paymentMethod,
  reference,
  receivedAt,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a finalized job order before recording invoice payment.', 400, {
      path: '/api/job-orders/:id/invoice/payments',
    });
  }

  const normalizedAmount = Number(amountPaidCents);
  const normalizedReceivedAt = trimOrUndefined(receivedAt);

  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
    throw new ApiError('Enter a positive payment amount in cents.', 400, {
      path: '/api/job-orders/:id/invoice/payments',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/invoice/payments`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        amountPaidCents: normalizedAmount,
        paymentMethod,
        reference: trimOrUndefined(reference),
        receivedAt: normalizedReceivedAt ? new Date(normalizedReceivedAt).toISOString() : undefined,
      },
    }),
  );
};
