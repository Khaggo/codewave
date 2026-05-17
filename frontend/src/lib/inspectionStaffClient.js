import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const parseResponse = async (response) => {
  const rawText = await response.text();
  return rawText ? JSON.parse(rawText) : null;
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

const request = async (path, { accessToken, body, method = 'GET' } = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: isFormData
      ? {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        }
      : {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(getApiErrorMessage(data, response), response.status, data);
  }

  return data;
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

  return Array.isArray(inspections) ? inspections.map((inspection) => normalizeInspection(inspection)) : [];
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
