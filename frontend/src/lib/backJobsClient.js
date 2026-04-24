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

const normalizeFindingRequest = (finding) => ({
  category: String(finding?.category ?? '').trim(),
  label: String(finding?.label ?? '').trim(),
  severity: trimOrUndefined(finding?.severity),
  notes: trimOrUndefined(finding?.notes),
  isValidated: Boolean(finding?.isValidated),
});

export const normalizeBackJobForReview = (backJob) => {
  if (!backJob || typeof backJob !== 'object') {
    return null;
  }

  const findings = Array.isArray(backJob.findings) ? backJob.findings : [];
  const validatedFindingCount = findings.filter((finding) => finding?.isValidated).length;
  const highestSeverity =
    findings.find((finding) => finding?.severity === 'high')?.severity ??
    findings.find((finding) => finding?.severity === 'medium')?.severity ??
    findings.find((finding) => finding?.severity === 'low')?.severity ??
    findings[0]?.severity ??
    'info';

  return {
    ...backJob,
    findings,
    findingCount: findings.length,
    validatedFindingCount,
    highestSeverity,
    hasReturnInspection: Boolean(backJob.returnInspectionId),
    hasReworkJobOrder: Boolean(backJob.reworkJobOrderId),
  };
};

export const normalizeBackJobsForReview = (backJobs) =>
  Array.isArray(backJobs)
    ? backJobs.map((backJob) => normalizeBackJobForReview(backJob)).filter(Boolean)
    : [];

export const createBackJobCase = async ({
  accessToken,
  customerUserId,
  vehicleId,
  originalJobOrderId,
  originalBookingId,
  returnInspectionId,
  complaint,
  reviewNotes,
  findings,
}) => {
  const normalizedFindings = Array.isArray(findings)
    ? findings
        .map((finding) => normalizeFindingRequest(finding))
        .filter((finding) => finding.category && finding.label)
    : [];

  return normalizeBackJobForReview(
    await request('/api/back-jobs', {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        customerUserId: String(customerUserId ?? '').trim(),
        vehicleId: String(vehicleId ?? '').trim(),
        originalJobOrderId: String(originalJobOrderId ?? '').trim(),
        originalBookingId: trimOrUndefined(originalBookingId),
        returnInspectionId: trimOrUndefined(returnInspectionId),
        complaint: String(complaint ?? '').trim(),
        reviewNotes: trimOrUndefined(reviewNotes),
        findings: normalizedFindings.length > 0 ? normalizedFindings : undefined,
      },
    }),
  );
};

export const getBackJobById = async ({ accessToken, backJobId }) => {
  const normalizedBackJobId = trimOrUndefined(backJobId);

  if (!normalizedBackJobId) {
    throw new ApiError('Enter a back-job id before loading detail.', 400, {
      path: '/api/back-jobs/:id',
    });
  }

  return normalizeBackJobForReview(
    await request(`/api/back-jobs/${normalizedBackJobId}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const listBackJobsByVehicle = async ({ accessToken, vehicleId }) => {
  const normalizedVehicleId = trimOrUndefined(vehicleId);

  if (!normalizedVehicleId) {
    throw new ApiError('Enter a vehicle id before loading back-jobs.', 400, {
      path: '/api/vehicles/:id/back-jobs',
    });
  }

  return normalizeBackJobsForReview(
    await request(`/api/vehicles/${normalizedVehicleId}/back-jobs`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const updateBackJobStatus = async ({
  accessToken,
  backJobId,
  status,
  returnInspectionId,
  reviewNotes,
  resolutionNotes,
}) => {
  const normalizedBackJobId = trimOrUndefined(backJobId);

  if (!normalizedBackJobId) {
    throw new ApiError('Load a back-job before updating review status.', 400, {
      path: '/api/back-jobs/:id/status',
    });
  }

  return normalizeBackJobForReview(
    await request(`/api/back-jobs/${normalizedBackJobId}/status`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        status,
        returnInspectionId: trimOrUndefined(returnInspectionId),
        reviewNotes: trimOrUndefined(reviewNotes),
        resolutionNotes: trimOrUndefined(resolutionNotes),
      },
    }),
  );
};

export const createReworkJobOrderFromBackJob = async ({
  accessToken,
  backJob,
  serviceAdviserUserId,
  serviceAdviserCode,
  notes,
  items,
  assignedTechnicianIds,
}) => {
  if (!backJob?.id) {
    throw new ApiError('Load an approved back-job before creating rework.', 400, {
      path: '/api/job-orders',
    });
  }

  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => ({
          name: String(item?.name ?? '').trim(),
          description: trimOrUndefined(item?.description),
          estimatedHours: Number.isInteger(Number(item?.estimatedHours))
            ? Number(item.estimatedHours)
            : undefined,
        }))
        .filter((item) => item.name)
    : [];

  if (normalizedItems.length === 0) {
    throw new ApiError('Add at least one rework item before creating the job order.', 400, {
      path: '/api/job-orders',
    });
  }

  return request('/api/job-orders', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      sourceType: 'back_job',
      sourceId: backJob.id,
      customerUserId: backJob.customerUserId,
      vehicleId: backJob.vehicleId,
      serviceAdviserUserId,
      serviceAdviserCode,
      notes: trimOrUndefined(notes),
      items: normalizedItems,
      assignedTechnicianIds:
        Array.isArray(assignedTechnicianIds) && assignedTechnicianIds.length > 0
          ? assignedTechnicianIds
          : undefined,
    },
  });
};
