import { ApiError, getApiBaseUrl } from './authClient';
const JOB_ORDERS_REQUEST_TIMEOUT_MS = 8000;

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = JOB_ORDERS_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const runRequest = async () => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...rest,
        signal: abortController?.signal,
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
                  `Timed out reaching ${apiBaseUrl}${path} after ${timeoutMs}ms.`,
                  0,
                  {
                    path,
                    apiBaseUrl,
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
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${apiBaseUrl}${path}. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl,
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

export const JOB_ORDER_STATUSES = [
  'draft',
  'assigned',
  'in_progress',
  'ready_for_qa',
  'blocked',
  'finalized',
  'cancelled',
];

export const TECHNICIAN_TARGET_STATUSES = ['in_progress', 'blocked', 'ready_for_qa'];

export const JOB_ORDER_PROGRESS_ENTRY_TYPES = [
  'note',
  'work_started',
  'work_completed',
  'issue_found',
];

export const formatJobOrderStatusLabel = (status) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'ready_for_qa':
      return 'Ready for QA';
    case 'blocked':
      return 'Blocked';
    case 'finalized':
      return 'Finalized';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status ?? 'Unknown';
  }
};

export const listAssignedJobOrders = async ({ accessToken }) => {
  const data = await request('/api/job-orders/assigned', {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return Array.isArray(data) ? data : [];
};

export const getJobOrderById = async ({ jobOrderId, accessToken }) =>
  request(`/api/job-orders/${jobOrderId}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

export const updateJobOrderStatus = async ({
  jobOrderId,
  status,
  reason,
  expectedUpdatedAt,
  accessToken,
}) =>
  request(`/api/job-orders/${jobOrderId}/status`, {
    method: 'PATCH',
    headers: buildAuthHeaders(accessToken),
    body: {
      status,
      reason: reason ? String(reason).trim() : undefined,
      expectedUpdatedAt: expectedUpdatedAt ? String(expectedUpdatedAt).trim() : undefined,
    },
  });

export const addJobOrderProgress = async ({
  jobOrderId,
  entryType,
  message,
  completedItemIds,
  expectedUpdatedAt,
  accessToken,
}) =>
  request(`/api/job-orders/${jobOrderId}/progress`, {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: {
      entryType,
      message: String(message ?? '').trim(),
      completedItemIds: Array.isArray(completedItemIds) && completedItemIds.length
        ? completedItemIds
        : undefined,
      expectedUpdatedAt: expectedUpdatedAt ? String(expectedUpdatedAt).trim() : undefined,
    },
  });

export const addJobOrderPhotoEvidence = async ({
  jobOrderId,
  file,
  caption,
  linkedEntityType,
  linkedEntityId,
  expectedUpdatedAt,
  accessToken,
}) => {
  if (!jobOrderId) {
    throw new ApiError('Load a job order before uploading photo evidence.', 400, {
      path: '/api/job-orders/:id/photos/upload',
    });
  }

  if (!file?.uri) {
    throw new ApiError('Choose an image before uploading photo evidence.', 400, {
      path: '/api/job-orders/:id/photos/upload',
    });
  }

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name ?? `job-order-${jobOrderId}.jpg`,
    type: file.mimeType ?? file.type ?? 'image/jpeg',
  });

  if (caption ? String(caption).trim() : '') {
    formData.append('caption', String(caption).trim());
  }

  if (linkedEntityType ? String(linkedEntityType).trim() : '') {
    formData.append('linkedEntityType', String(linkedEntityType).trim());
  }

  if (linkedEntityId ? String(linkedEntityId).trim() : '') {
    formData.append('linkedEntityId', String(linkedEntityId).trim());
  }

  if (expectedUpdatedAt ? String(expectedUpdatedAt).trim() : '') {
    formData.append('expectedUpdatedAt', String(expectedUpdatedAt).trim());
  }

  return request(`/api/job-orders/${jobOrderId}/photos/upload`, {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: formData,
  });
};
