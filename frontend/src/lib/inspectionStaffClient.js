import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const INTAKE_INSPECTIONS_PATH = '/api/intake-inspections';
const INSPECTION_HISTORY_PAGE_SIZE = 20;

const parseResponse = async (response) => {
  const rawText = await response.text();
  return rawText ? JSON.parse(rawText) : null;
};

const appendQuery = (path, query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

const getInspectionVerificationState = (inspection) => {
  const findings = Array.isArray(inspection?.findings) ? inspection.findings : [];

  if (!findings.length) {
    return 'unverified';
  }

  const verifiedCount = findings.filter((finding) => finding?.isVerified).length;

  if (verifiedCount === findings.length) {
    return 'verified';
  }

  if (verifiedCount > 0) {
    return 'mixed_verification';
  }

  return 'unverified';
};

const normalizeInspectionFinding = (finding) =>
  finding
    ? {
        ...finding,
        summary: `${finding.category}: ${finding.label}`,
      }
    : finding;

const normalizeInspection = (inspection) => {
  if (!inspection) {
    return inspection;
  }

  const findings = Array.isArray(inspection.findings)
    ? inspection.findings.map((finding) => normalizeInspectionFinding(finding))
    : [];

  return {
    ...inspection,
    findings,
    evidence: Array.isArray(inspection.evidence)
      ? inspection.evidence.map((item) => ({
          id: item.id,
          slot: item.slot || 'general',
          originalName: item.originalName || 'Inspection evidence',
          mimeType: item.mimeType || 'application/octet-stream',
          byteSize: Number(item.byteSize) || 0,
          createdAt: item.createdAt || null,
          fileUrl: item.fileUrl || null,
          provenance: {
            source: 'staff_upload',
            capturedAt: item.createdAt || null,
          },
        }))
      : [],
    verificationState: getInspectionVerificationState({ ...inspection, findings }),
  };
};

const getApiErrorMessage = (data, response) => {
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message.map((part) => String(part ?? '').trim()).filter(Boolean).join(' ');
  }

  return `Request failed with status ${response.status}`;
};

const isUploadableBlob = (value) =>
  value &&
  typeof value === 'object' &&
  typeof value.arrayBuffer === 'function' &&
  typeof value.size === 'number';

const request = async (
  path,
  { accessToken, body, headers = {}, method = 'GET', query, responseType = 'json' } = {},
) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${appendQuery(path, query)}`, {
    method,
    headers: isFormData
      ? {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...headers,
        }
      : {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...headers,
        },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = responseType === 'blob' && response.ok ? await response.blob() : await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(getApiErrorMessage(data, response), response.status, data);
  }

  return data;
};

const requireInspectionVersion = (version) => {
  const normalizedVersion = Number(version);
  if (!Number.isInteger(normalizedVersion) || normalizedVersion < 1) {
    throw new ApiError('Reload this intake before saving because its version is missing.', 428, {
      code: 'INTAKE_VERSION_REQUIRED',
    });
  }
  return normalizedVersion;
};

const normalizeHistoryPage = (payload, { cursor, limit }) => {
  const requestedLimit = Math.min(25, Math.max(1, Number(limit) || INSPECTION_HISTORY_PAGE_SIZE));
  const legacyItems = Array.isArray(payload) ? payload : null;
  const items = legacyItems ?? (Array.isArray(payload?.items) ? payload.items : []);
  const sortedItems = [...items].sort((left, right) => {
    const dateDelta = (Date.parse(right?.createdAt ?? '') || 0) - (Date.parse(left?.createdAt ?? '') || 0);
    return dateDelta || String(right?.id ?? '').localeCompare(String(left?.id ?? ''));
  });

  if (legacyItems) {
    const offset = Number.parseInt(String(cursor ?? '0'), 10) || 0;
    const pageItems = sortedItems.slice(offset, offset + requestedLimit);
    const nextOffset = offset + pageItems.length;
    return {
      items: pageItems.map((inspection) => normalizeInspection(inspection)),
      nextCursor: nextOffset < sortedItems.length ? String(nextOffset) : null,
      total: sortedItems.length,
      compatibilityMode: 'legacy',
    };
  }

  return {
    items: sortedItems.map((inspection) => normalizeInspection(inspection)),
    nextCursor: payload?.page?.nextCursor ?? payload?.nextCursor ?? null,
    total: Number.isFinite(payload?.page?.total)
      ? payload.page.total
      : Number.isFinite(payload?.total)
        ? payload.total
        : null,
    compatibilityMode: 'planned',
  };
};

export const listVehicleInspections = async ({ vehicleId, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before loading inspections.', 400, {
      path: '/api/vehicles/:id/inspections',
    });
  }

  const inspections = await request(`/api/vehicles/${vehicleId}/inspections`, {
    accessToken,
  });

  const items = Array.isArray(inspections)
    ? inspections
    : Array.isArray(inspections?.items)
      ? inspections.items
      : [];

  return items.map((inspection) => normalizeInspection(inspection));
};

export const listVehicleInspectionHistory = async ({
  vehicleId,
  accessToken,
  cursor,
  limit = INSPECTION_HISTORY_PAGE_SIZE,
}) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before loading inspections.', 400, {
      path: '/api/vehicles/:id/inspection-history',
    });
  }

  try {
    const page = await request(`/api/vehicles/${vehicleId}/inspection-history`, {
      accessToken,
      query: { cursor, limit },
    });
    return normalizeHistoryPage(page, { cursor, limit });
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 405, 501].includes(error.status)) throw error;
    const legacy = await request(`/api/vehicles/${vehicleId}/inspections`, { accessToken });
    return normalizeHistoryPage(legacy, { cursor, limit });
  }
};

export const getIntakeDraftForBooking = async ({ bookingId, vehicleId, accessToken }) => {
  if (!bookingId || !vehicleId) return null;

  let cursor;
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    const result = await request(`/api/vehicles/${vehicleId}/inspection-history`, {
      accessToken,
      query: { cursor, limit: 25, status: 'pending' },
    });
    const match = (Array.isArray(result?.items) ? result.items : []).find(
      (inspection) => inspection?.inspectionType === 'intake' && inspection?.bookingId === bookingId,
    );
    if (match) return normalizeInspection(match);
    cursor = result?.page?.nextCursor;
    if (!cursor) break;
  }
  return null;
};

export const createIntakeDraft = async ({ vehicleId, draft, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before saving an intake draft.', 400, {
      path: '/api/vehicles/:id/intake-inspections/drafts',
    });
  }
  return normalizeInspection(
    await request(`/api/vehicles/${vehicleId}/intake-inspections/drafts`, {
      method: 'POST',
      accessToken,
      body: draft,
    }),
  );
};

export const updateIntakeDraft = async ({ inspectionId, version, draft, accessToken }) => {
  if (!inspectionId) {
    throw new ApiError('Load or create an intake draft before updating it.', 400, {
      path: `${INTAKE_INSPECTIONS_PATH}/:id`,
    });
  }
  return normalizeInspection(
    await request(`${INTAKE_INSPECTIONS_PATH}/${inspectionId}`, {
      method: 'PATCH',
      accessToken,
      headers: { 'If-Match': String(requireInspectionVersion(version)) },
      body: draft,
    }),
  );
};

export const completeIntakeDraft = async ({ inspectionId, version, draft, accessToken }) => {
  if (!inspectionId) {
    throw new ApiError('Save the intake draft before completing it.', 400, {
      path: `${INTAKE_INSPECTIONS_PATH}/:id/complete`,
    });
  }
  let result;
  try {
    result = await request(`${INTAKE_INSPECTIONS_PATH}/${inspectionId}/complete`, {
      method: 'POST',
      accessToken,
      headers: { 'If-Match': String(requireInspectionVersion(version)) },
    });
  } catch (error) {
    const code = error?.data?.code ?? error?.details?.code ?? error?.code;
    if (code === 'STICKER_OBSERVATION_CONFLICT') {
      throw new ApiError(
        'This intake already has a different sticker observation. Reload before completing.',
        409,
        { code },
      );
    }
    throw error;
  }
  return {
    ...result,
    inspection: normalizeInspection(result?.inspection ?? result),
  };
};

export const uploadIntakeInspectionEvidence = async ({
  inspectionId,
  slot,
  file,
  fileName,
  accessToken,
}) => {
  if (!inspectionId) {
    throw new ApiError('Save the intake draft before uploading evidence.', 400, {
      path: `${INTAKE_INSPECTIONS_PATH}/:id/evidence`,
    });
  }
  if (!isUploadableBlob(file)) {
    throw new ApiError('Choose an image file before uploading inspection evidence.', 400, {
      path: `${INTAKE_INSPECTIONS_PATH}/:id/evidence`,
    });
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError('Inspection evidence must be 5 MB or smaller.', 400, {
      code: 'INSPECTION_EVIDENCE_TOO_LARGE',
    });
  }
  if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new ApiError('Inspection evidence must be a JPEG, PNG, or WebP image.', 400, {
      code: 'INSPECTION_EVIDENCE_TYPE_UNSUPPORTED',
    });
  }

  const formData = new FormData();
  formData.append('file', file, String(fileName ?? file.name ?? 'inspection-photo.jpg'));
  if (String(slot ?? '').trim()) formData.append('slot', String(slot).trim());

  return request(`${INTAKE_INSPECTIONS_PATH}/${inspectionId}/evidence`, {
    method: 'POST',
    accessToken,
    body: formData,
  });
};

export const loadInspectionEvidenceFile = ({ fileUrl, accessToken }) => {
  const normalizedPath = String(fileUrl ?? '').trim();
  if (!normalizedPath.startsWith(`${INTAKE_INSPECTIONS_PATH}/`)) {
    throw new ApiError('This evidence file link is unavailable or unsafe.', 400, {
      code: 'INSPECTION_EVIDENCE_URL_INVALID',
    });
  }
  return request(normalizedPath, { accessToken, responseType: 'blob' });
};

export const createVehicleInspection = async ({ vehicleId, inspection, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before saving an inspection.', 400, {
      path: '/api/vehicles/:id/inspections',
    });
  }

  return normalizeInspection(
    await request(`/api/vehicles/${vehicleId}/inspections`, {
      method: 'POST',
      accessToken,
      body: inspection,
    }),
  );
};

export const uploadVehicleInspectionPhoto = async ({ vehicleId, slot, file, fileName, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select a vehicle before uploading an inspection photo.', 400, {
      path: '/api/vehicles/:id/inspections/photos/upload',
    });
  }

  if (!isUploadableBlob(file)) {
    throw new ApiError('Choose an image file before uploading inspection evidence.', 400, {
      path: '/api/vehicles/:id/inspections/photos/upload',
    });
  }

  const formData = new FormData();
  formData.append('file', file, String(fileName ?? file.name ?? 'inspection-photo.jpg'));

  if (String(slot ?? '').trim()) {
    formData.append('slot', String(slot).trim());
  }

  return request(`/api/vehicles/${vehicleId}/inspections/photos/upload`, {
    method: 'POST',
    accessToken,
    body: formData,
  });
};
