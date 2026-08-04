import { ApiError } from './authClient';
import { normalizeOptionalScopeQuery } from './apiScopeCompatibility.mjs';
import {
  buildAuthorizedHeaders,
  requestJobOrderApi as request,
  trimOrUndefined,
} from './jobOrderClientTransport.js';
import { requireWorkClaimHeaders } from './staffWorkQueueClient';
import {
  normalizeJobOrderForWorkbench,
  normalizeJobOrderWorkbenchSummary,
} from './jobOrderWorkbenchNormalization.mjs';

export {
  normalizeJobOrderForWorkbench,
  normalizeJobOrderWorkbenchSummary,
} from './jobOrderWorkbenchNormalization.mjs';
export { getJobOrderAssetUrl } from './jobOrderClientTransport.js';
export {
  exportJobOrderInvoicePdf,
  getJobOrderInvoiceLookup,
  reconcileJobOrderInvoicePaymongoCheckout,
  recordJobOrderInvoicePayment,
  startJobOrderInvoicePaymongoCheckout,
} from './jobOrderInvoiceClient.js';

export const listJobOrderWorkbenchSummaries = async ({
  accessToken,
  month,
  scope,
  limit = 25,
  signal,
}) => {
  const params = new URLSearchParams();
  const normalizedMonth = trimOrUndefined(month);
  if (normalizedMonth) {
    params.set('month', normalizedMonth);
  }
  const normalizedScope = normalizeOptionalScopeQuery(scope);
  if (normalizedScope) {
    params.set('scope', normalizedScope);
  }
  params.set('limit', String(Math.min(Math.max(Number(limit) || 25, 1), 50)));

  const path = params.size ? `/api/job-orders/workbench-summaries?${params.toString()}` : '/api/job-orders/workbench-summaries';
  const summaries = await request(path, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
    signal,
  });

  return Array.isArray(summaries) ? summaries.map((jobOrder) => normalizeJobOrderWorkbenchSummary(jobOrder)) : [];
};

export const listJobOrderWorkbenchCalendar = async ({
  accessToken,
  month,
  scope,
  signal,
}) => {
  const params = new URLSearchParams();
  const normalizedMonth = trimOrUndefined(month);
  if (normalizedMonth) {
    params.set('month', normalizedMonth);
  }
  const normalizedScope = normalizeOptionalScopeQuery(scope);
  if (normalizedScope) {
    params.set('scope', normalizedScope);
  }

  const path = params.size ? `/api/job-orders/workbench-calendar?${params.toString()}` : '/api/job-orders/workbench-calendar';
  const data = await request(path, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
    signal,
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
  claimId,
  sourceId,
  customerUserId,
  vehicleId,
  serviceAdviserUserId,
  serviceAdviserCode,
  notes,
  items,
  assignedTechnicianIds,
  assignments,
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
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        sourceType: 'booking',
        sourceId,
        customerUserId,
        vehicleId,
        serviceAdviserUserId,
        serviceAdviserCode,
        notes: trimOrUndefined(notes),
        items: normalizedItems,
        assignments:
          Array.isArray(assignments) && assignments.length > 0
            ? assignments
            : Array.isArray(assignedTechnicianIds) && assignedTechnicianIds.length > 0
              ? assignedTechnicianIds.map((technicianProfileId) => ({
                  technicianProfileId,
                  selectedSpecialty: 'general repair',
                }))
              : undefined,
      },
    }),
  );
};
export const sendBookingToWorkshop = async ({ bookingId, accessToken }) => {
  if (!bookingId) {
    throw new ApiError('Select a confirmed booking before sending work to the workshop.', 400, {
      path: '/api/job-orders/booking-handoffs/:bookingId',
    });
  }

  return request(`/api/job-orders/booking-handoffs/${bookingId}`, {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
  });
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
  assignments,
  expectedUpdatedAt,
  accessToken,
  claimId,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before saving technician assignments.', 400, {
      path: '/api/job-orders/:id/assignments',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/assignments`, {
      method: 'PATCH',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        assignments:
          Array.isArray(assignments) && assignments.length > 0
            ? assignments
            : Array.isArray(assignedTechnicianIds)
              ? [...new Set(assignedTechnicianIds.filter(Boolean))].map((technicianProfileId) => ({
                  technicianProfileId,
                  selectedSpecialty: 'general repair',
                }))
              : [],
        expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
      },
    }),
  );
};

export const updateJobOrderWorkshopStage = async ({
  jobOrderId,
  stage,
  note,
  expectedUpdatedAt,
  accessToken,
  claimId,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before saving a workshop stage update.', 400, {
      path: '/api/job-orders/:id/workshop-stage',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/workshop-stage`, {
      method: 'PATCH',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        stage,
        note: trimOrUndefined(note),
        expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
      },
    }),
  );
};

export const updateJobOrderStatus = async ({
  jobOrderId,
  status,
  reason,
  expectedUpdatedAt,
  accessToken,
  claimId,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before saving a status update.', 400, {
      path: '/api/job-orders/:id/status',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/status`, {
      method: 'PATCH',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        status,
        reason: trimOrUndefined(reason),
        expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
      },
    }),
  );
};

export const addJobOrderProgressEntry = async ({
  jobOrderId,
  workItemId,
  entryType,
  message,
  completedItemIds,
  expectedUpdatedAt,
  accessToken,
  claimId,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before appending progress.', 400, {
      path: '/api/job-orders/:id/progress',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/progress`, {
      method: 'POST',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        workItemId: trimOrUndefined(workItemId),
        entryType,
        message: String(message ?? '').trim(),
        completedItemIds:
          Array.isArray(completedItemIds) && completedItemIds.length > 0
            ? completedItemIds
            : undefined,
        expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
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
  expectedUpdatedAt,
  accessToken,
  claimId,
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
  const normalizedExpectedUpdatedAt = trimOrUndefined(expectedUpdatedAt);
  if (normalizedExpectedUpdatedAt) {
    formData.append('expectedUpdatedAt', normalizedExpectedUpdatedAt);
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/photos/upload`, {
      method: 'POST',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
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
  expectedUpdatedAt,
  accessToken,
  claimId,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before finalizing invoice-ready work.', 400, {
      path: '/api/job-orders/:id/finalize',
    });
  }

  return normalizeJobOrderForWorkbench(
    await request(`/api/job-orders/${jobOrderId}/finalize`, {
      method: 'POST',
      headers: {
        ...buildAuthorizedHeaders(accessToken),
        ...requireWorkClaimHeaders(claimId),
      },
      body: {
        summary: trimOrUndefined(summary),
        amountPaid: Number.isInteger(Number(amountPaid)) && Number(amountPaid) > 0 ? Number(amountPaid) : undefined,
        paymentMethod: trimOrUndefined(paymentMethod),
        paymentReference: trimOrUndefined(paymentReference),
        receivedAt: trimOrUndefined(receivedAt) ? new Date(receivedAt).toISOString() : undefined,
        expectedUpdatedAt: trimOrUndefined(expectedUpdatedAt),
      },
    }),
  );
};


export const exportTechnicianChecklistPdf = async ({ jobOrderId, assignmentId, accessToken }) => {
  if (!jobOrderId || !assignmentId) {
    throw new ApiError('Load a saved assignment before exporting the technician checklist.', 400, {
      path: '/api/job-orders/:id/assignments/:assignmentId/checklist.pdf',
    });
  }

  return request(`/api/job-orders/${jobOrderId}/assignments/${assignmentId}/checklist.pdf`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
    responseType: 'blob',
  });
};
