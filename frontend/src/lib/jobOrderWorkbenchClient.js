import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const trimOrUndefined = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : undefined;
};

const request = async (path, options = {}) => {
  const { body, headers, responseType = 'json', ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: isFormData
      ? {
          ...(headers ?? {}),
        }
      : {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (responseType === 'blob') {
    if (!response.ok) {
      const rawText = await response.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      const message =
        data?.message && typeof data.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`;

      throw new ApiError(message, response.status, data);
    }

    return response.blob();
  }

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
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

export const normalizeJobOrderWorkbenchSummary = (jobOrder) => ({
  id: jobOrder?.id ?? '',
  status: jobOrder?.status ?? 'draft',
  sourceType: jobOrder?.sourceType ?? 'booking',
  workDate: jobOrder?.workDate ?? null,
  vehicleId: jobOrder?.vehicleId ?? null,
  serviceAdviserCode: jobOrder?.serviceAdviserCode ?? null,
  assignedTechnicianIds: Array.isArray(jobOrder?.assignedTechnicianIds)
    ? jobOrder.assignedTechnicianIds.filter(Boolean)
    : [],
  updatedAt: jobOrder?.updatedAt ?? null,
});

export const getJobOrderAssetUrl = (path) => {
  const normalizedPath = trimOrUndefined(path);
  if (!normalizedPath) {
    return '';
  }

  return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
};

export const listJobOrderWorkbenchSummaries = async ({ accessToken, month, scope }) => {
  const params = new URLSearchParams();
  const normalizedMonth = trimOrUndefined(month);
  if (normalizedMonth) {
    params.set('month', normalizedMonth);
  }
  const normalizedScope = trimOrUndefined(scope);
  if (normalizedScope) {
    params.set('scope', normalizedScope);
  }

  const path = params.size ? `/api/job-orders/workbench-summaries?${params.toString()}` : '/api/job-orders/workbench-summaries';
  const summaries = await request(path, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

  return Array.isArray(summaries) ? summaries.map((jobOrder) => normalizeJobOrderWorkbenchSummary(jobOrder)) : [];
};

export const listJobOrderWorkbenchCalendar = async ({ accessToken, month, scope }) => {
  const params = new URLSearchParams();
  const normalizedMonth = trimOrUndefined(month);
  if (normalizedMonth) {
    params.set('month', normalizedMonth);
  }
  const normalizedScope = trimOrUndefined(scope);
  if (normalizedScope) {
    params.set('scope', normalizedScope);
  }

  const path = params.size ? `/api/job-orders/workbench-calendar?${params.toString()}` : '/api/job-orders/workbench-calendar';
  const data = await request(path, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

  return {
    jobOrderDates: Array.isArray(data?.jobOrderDates) ? data.jobOrderDates : [],
    bookingQueueDates: Array.isArray(data?.bookingQueueDates) ? data.bookingQueueDates : [],
  };
};

export const listVehicleJobOrders = async ({ vehicleId, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before loading job orders.', 400, {
      path: '/api/job-orders/vehicles/:id',
    });
  }

  const jobOrders = await request(`/api/job-orders/vehicles/${vehicleId}`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

  return Array.isArray(jobOrders)
    ? jobOrders.map((jobOrder) => normalizeJobOrderForWorkbench(jobOrder)).filter(Boolean)
    : [];
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
              ? Math.max(1, Math.ceil(item.estimatedHours))
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

export const replaceJobOrderAssignments = async ({
  jobOrderId,
  assignedTechnicianIds,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before saving technician assignments.', 400, {
      path: '/api/job-orders/:id/assignments',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/assignments`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        assignedTechnicianIds: Array.isArray(assignedTechnicianIds)
          ? [...new Set(assignedTechnicianIds.filter(Boolean))]
          : [],
      },
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
  file,
  caption,
  linkedEntityType,
  linkedEntityId,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before uploading photo evidence.', 400, {
      path: '/api/job-orders/:id/photos/upload',
    });
  }

  if (!(file instanceof File) || file.size < 1) {
    throw new ApiError('Choose an image file before uploading photo evidence.', 400, {
      path: '/api/job-orders/:id/photos/upload',
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  const normalizedCaption = trimOrUndefined(caption);
  if (normalizedCaption) {
    formData.append('caption', normalizedCaption);
  }
  const normalizedLinkedEntityType = trimOrUndefined(linkedEntityType);
  if (normalizedLinkedEntityType) {
    formData.append('linkedEntityType', normalizedLinkedEntityType);
  }
  const normalizedLinkedEntityId = trimOrUndefined(linkedEntityId);
  if (normalizedLinkedEntityId) {
    formData.append('linkedEntityId', normalizedLinkedEntityId);
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/photos/upload`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: formData,
    }),
  );
};

export const finalizeJobOrder = async ({
  jobOrderId,
  summary,
  amountPaid,
  paymentMethod,
  paymentReference,
  receivedAt,
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
        amountPaid: Number.isInteger(Number(amountPaid)) && Number(amountPaid) > 0 ? Number(amountPaid) : undefined,
        paymentMethod: trimOrUndefined(paymentMethod),
        paymentReference: trimOrUndefined(paymentReference),
        receivedAt: trimOrUndefined(receivedAt) ? new Date(receivedAt).toISOString() : undefined,
      },
    }),
  );
};

export const exportJobOrderInvoicePdf = async ({ jobOrderId, accessToken }) => {
  if (!jobOrderId) {
    throw new ApiError('Load a finalized job order before exporting the invoice PDF.', 400, {
      path: '/api/job-orders/:id/invoice/pdf',
    });
  }

  return request(`/api/job-orders/${jobOrderId}/invoice/pdf`, {
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
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a finalized job order before recording invoice payment.', 400, {
      path: '/api/job-orders/:id/invoice/payments',
    });
  }

  const normalizedAmount = Number(amountPaid);
  const normalizedReceivedAt = trimOrUndefined(receivedAt);

  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
    throw new ApiError('Enter a positive payment amount in pesos.', 400, {
      path: '/api/job-orders/:id/invoice/payments',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/invoice/payments`, {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        amountPaidCents: normalizedAmount * 100,
        paymentMethod,
        reference: trimOrUndefined(reference),
        receivedAt: normalizedReceivedAt ? new Date(normalizedReceivedAt).toISOString() : undefined,
      },
    }),
  );
};
