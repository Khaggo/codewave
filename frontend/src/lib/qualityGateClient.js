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

export const normalizeQualityGateForReview = (qualityGate) => {
  if (!qualityGate || typeof qualityGate !== 'object') {
    return null;
  }

  const findings = Array.isArray(qualityGate.findings) ? qualityGate.findings : [];
  const overrides = Array.isArray(qualityGate.overrides) ? qualityGate.overrides : [];
  const latestOverride =
    overrides.length > 0
      ? [...overrides].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0]
      : null;

  return {
    ...qualityGate,
    findings,
    overrides,
    blockingFindings: findings.filter((finding) => finding?.severity === 'critical'),
    warningFindings: findings.filter((finding) => finding?.severity === 'warning'),
    latestOverride,
    auditJobStatus: qualityGate.auditJob?.status ?? null,
    isReleaseAllowed: qualityGate.status === 'passed' || qualityGate.status === 'overridden',
    isReleaseBlocked: qualityGate.status === 'pending_review' || qualityGate.status === 'blocked',
  };
};

export const getJobOrderQualityGate = async ({ jobOrderId, accessToken }) => {
  const normalizedJobOrderId = trimOrUndefined(jobOrderId);

  if (!normalizedJobOrderId) {
    throw new ApiError('Enter a job-order id before loading QA.', 400, {
      path: '/api/job-orders/:jobOrderId/qa',
    });
  }

  return normalizeQualityGateForReview(
    await request(`/api/job-orders/${normalizedJobOrderId}/qa`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const overrideJobOrderQualityGate = async ({ jobOrderId, reason, accessToken }) => {
  const normalizedJobOrderId = trimOrUndefined(jobOrderId);
  const normalizedReason = trimOrUndefined(reason);

  if (!normalizedJobOrderId) {
    throw new ApiError('Load a blocked quality gate before overriding QA.', 400, {
      path: '/api/job-orders/:jobOrderId/qa/override',
    });
  }

  if (!normalizedReason || normalizedReason.length < 8) {
    throw new ApiError('Enter an override reason with at least 8 characters.', 400, {
      path: '/api/job-orders/:jobOrderId/qa/override',
    });
  }

  return normalizeQualityGateForReview(
    await request(`/api/job-orders/${normalizedJobOrderId}/qa/override`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        reason: normalizedReason,
      },
    }),
  );
};

export const recordJobOrderQualityGateVerdict = async ({
  jobOrderId,
  verdict,
  note,
  accessToken,
}) => {
  const normalizedJobOrderId = trimOrUndefined(jobOrderId);
  const normalizedVerdict = trimOrUndefined(verdict);
  const normalizedNote = trimOrUndefined(note);

  if (!normalizedJobOrderId) {
    throw new ApiError('Load a pre-check review before recording the head-technician verdict.', 400, {
      path: '/api/job-orders/:jobOrderId/qa/verdict',
    });
  }

  if (!['passed', 'blocked'].includes(normalizedVerdict)) {
    throw new ApiError('Choose either Pass or Block before recording the head-technician verdict.', 400, {
      path: '/api/job-orders/:jobOrderId/qa/verdict',
    });
  }

  return normalizeQualityGateForReview(
    await request(`/api/job-orders/${normalizedJobOrderId}/qa/verdict`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        verdict: normalizedVerdict,
        note: normalizedNote,
      },
    }),
  );
};
