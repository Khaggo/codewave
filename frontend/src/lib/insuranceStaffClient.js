import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const insuranceStatusHints = {
  submitted: 'New customer intake waiting for staff review.',
  under_review: 'A service adviser is currently validating the inquiry and evidence.',
  needs_documents: 'The customer must add more supporting files before the inquiry can continue.',
  approved_for_record: 'The inquiry is approved for internal tracking record creation.',
  rejected: 'The inquiry cannot continue in its current form.',
  closed: 'The inquiry is closed and no longer accepts workflow updates.',
};

const insuranceDocumentTypeLabels = {
  or_cr: 'OR/CR',
  policy: 'Policy copy',
  photo: 'Damage photo',
  estimate: 'Repair estimate',
  other: 'Other document',
};

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const formatDocumentTypeLabel = (value) =>
  insuranceDocumentTypeLabels[value] ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const normalizeInsuranceDocumentForStaff = (document) => {
  if (!document || typeof document !== 'object') {
    return null;
  }

  return {
    id: document.id ?? null,
    inquiryId: document.inquiryId ?? null,
    fileName: String(document.fileName ?? '').trim(),
    fileUrl: String(document.fileUrl ?? '').trim(),
    documentType: document.documentType ?? 'other',
    documentTypeLabel: formatDocumentTypeLabel(document.documentType),
    notes: trimOrNull(document.notes),
    uploadedByUserId: document.uploadedByUserId ?? null,
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt ?? null,
  };
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

export const normalizeInsuranceInquiryForStaff = (inquiry) => {
  if (!inquiry || typeof inquiry !== 'object') {
    return null;
  }

  const documents = Array.isArray(inquiry.documents)
    ? inquiry.documents.map(normalizeInsuranceDocumentForStaff).filter(Boolean)
    : [];

  return {
    id: inquiry.id ?? null,
    userId: inquiry.userId ?? null,
    vehicleId: inquiry.vehicleId ?? null,
    inquiryType: inquiry.inquiryType ?? 'comprehensive',
    subject: String(inquiry.subject ?? '').trim(),
    description: String(inquiry.description ?? '').trim(),
    status: inquiry.status ?? 'submitted',
    statusHint: insuranceStatusHints[inquiry.status] ?? 'Insurance inquiry is available for review.',
    providerName: trimOrNull(inquiry.providerName),
    policyNumber: trimOrNull(inquiry.policyNumber),
    notes: trimOrNull(inquiry.notes),
    reviewNotes: trimOrNull(inquiry.reviewNotes),
    documentCount: documents.length,
    documents,
    createdAt: inquiry.createdAt ?? null,
    updatedAt: inquiry.updatedAt ?? null,
    reviewedAt: inquiry.reviewedAt ?? null,
    reviewedByUserId: inquiry.reviewedByUserId ?? null,
  };
};

export const getInsuranceInquiryById = async ({ inquiryId, accessToken }) => {
  if (!inquiryId) {
    throw new ApiError('Select a queue item or enter an inquiry id before loading detail.', 400, {
      path: '/api/insurance/inquiries/:id',
    });
  }

  return normalizeInsuranceInquiryForStaff(
    await request(`/api/insurance/inquiries/${inquiryId}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const updateInsuranceInquiryStatus = async ({
  inquiryId,
  status,
  reviewNotes,
  accessToken,
}) => {
  if (!inquiryId) {
    throw new ApiError('Select an insurance inquiry before saving a status update.', 400, {
      path: '/api/insurance/inquiries/:id/status',
    });
  }

  return normalizeInsuranceInquiryForStaff(
    await request(`/api/insurance/inquiries/${inquiryId}/status`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        status,
        reviewNotes: trimOrNull(reviewNotes) ?? undefined,
      },
    }),
  );
};
