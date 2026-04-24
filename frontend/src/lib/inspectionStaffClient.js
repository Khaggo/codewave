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

const request = async (path, { accessToken, body, method = 'GET' } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
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
