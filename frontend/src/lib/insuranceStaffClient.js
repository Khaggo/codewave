import { ApiError, notifyStaffSessionUnauthorized } from './authClient.js';
import {
  buildInsuranceBroadcastRequestBody,
  buildInsuranceReminderRequestBody,
} from './insuranceStaffMessagingPayload.js';
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const insuranceStatusHints = {
  submitted: 'New customer intake waiting for staff review.',
  needs_documents: 'The customer must add more supporting files before the inquiry can continue.',
  under_review: 'A service adviser is currently validating the inquiry and evidence.',
  for_approval: 'The case is ready for approval review.',
  approved: 'The case is approved and may move into payment or active servicing.',
  payment_pending: 'The case is waiting for payment confirmation or proof review.',
  active: 'The policy or case is actively being serviced.',
  for_renewal: 'The case requires renewal follow-up soon.',
  rejected: 'The inquiry cannot continue in its current form.',
  cancelled: 'The inquiry was cancelled before completion.',
  closed: 'The inquiry is closed and no longer accepts workflow updates.',
};

const insuranceDocumentTypeLabels = {
  or_cr: 'OR/CR',
  policy: 'Policy copy',
  valid_id: 'Valid ID',
  police_report: 'Police report',
  photo: 'Damage photo',
  estimate: 'Repair estimate',
  proof_of_payment: 'Proof of payment',
  other: 'Other document',
};

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const trimRequiredRequestValue = (value) => String(value ?? '').trim();

const normalizeOptionalWorkflowValue = (value) => trimOrNull(value) ?? undefined;
const formatDocumentTypeLabel = (value) =>
  insuranceDocumentTypeLabels[value] ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const appendQuery = (path, query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

const normalizeInsuranceDocumentForStaff = (document) => {
  if (!document || typeof document !== 'object') {
    return null;
  }

  const fileName = String(document.fileName ?? '').trim()
  const documentType = document.documentType ?? 'other'
  const createdAt = document.createdAt ?? null
  const normalizedDownloadRoute = String(document.downloadRoute ?? document.downloadUrl ?? '').trim()
  const downloadRoute = normalizedDownloadRoute.startsWith('/api/insurance/documents/') && normalizedDownloadRoute.endsWith('/file')
    ? normalizedDownloadRoute
    : null

  return {
    localKey: [documentType, fileName, createdAt ?? '', downloadRoute ?? ''].join('|'),
    fileName,
    downloadRoute,
    documentType,
    documentTypeLabel: formatDocumentTypeLabel(documentType),
    notes: trimOrNull(document.notes),
    createdAt,
    updatedAt: document.updatedAt ?? null,
  };
};

const normalizeInsuranceActivityForStaff = (activity) => {
  if (!activity || typeof activity !== 'object') {
    return null;
  }

  return {
    id: activity.id ?? null,
    action: String(activity.action ?? '').trim(),
    documentType: activity.documentType ?? null,
    actorUserId: activity.actorUserId ?? null,
    notes: trimOrNull(activity.notes),
    createdAt: activity.createdAt ?? null,
    updatedAt: activity.updatedAt ?? null,
  };
};

const request = async (path, options = {}) => {
  const { body, headers, method = 'GET', query, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${appendQuery(path, query)}`, {
    ...rest,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    if (response.status === 401) {
      notifyStaffSessionUnauthorized({
        path,
        source: 'insuranceStaffClient',
      });
    }

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
  const activities = Array.isArray(inquiry.activities)
    ? inquiry.activities.map(normalizeInsuranceActivityForStaff).filter(Boolean)
    : [];
  const documentRequirements = Array.isArray(inquiry.documentRequirements)
    ? inquiry.documentRequirements
        .map((requirement) => {
          const documentType = String(requirement?.documentType ?? '').trim()
          if (!documentType) return null

          return {
            documentType,
            minimumCount: Math.max(0, Number(requirement.minimumCount ?? 0)),
            uploadedCount: Math.max(0, Number(requirement.uploadedCount ?? 0)),
            outstandingCount: Math.max(0, Number(requirement.outstandingCount ?? 0)),
            required: Boolean(requirement.required),
            conditional: Boolean(requirement.conditional),
            requested: Boolean(requirement.requested),
            satisfied: Boolean(requirement.satisfied),
          }
        })
        .filter(Boolean)
    : []

  return {
    id: inquiry.id ?? null,
    inquiryReference: inquiry.inquiryReference ?? inquiry.reference ?? null,
    userId: inquiry.userId ?? null,
    vehicleId: inquiry.vehicleId ?? null,
    inquiryType: inquiry.inquiryType ?? 'comprehensive',
    purpose: inquiry.purpose ?? 'quotation',
    subject: String(inquiry.subject ?? '').trim(),
    description: String(inquiry.description ?? '').trim(),
    customerDisplayName: trimOrNull(inquiry.customerDisplayName) ?? 'Unknown customer',
    vehicleLabel: trimOrNull(inquiry.vehicleLabel) ?? 'Unknown vehicle',
    status: inquiry.status ?? 'submitted',
    documentStatus: inquiry.documentStatus ?? 'incomplete',
    paymentStatus: inquiry.paymentStatus ?? 'not_required',
    renewalStatus: inquiry.renewalStatus ?? 'not_applicable',
    statusHint: insuranceStatusHints[inquiry.status] ?? 'Insurance inquiry is available for review.',
    providerName: trimOrNull(inquiry.providerName),
    policyNumber: trimOrNull(inquiry.policyNumber),
    notes: trimOrNull(inquiry.notes),
    reviewNotes: trimOrNull(inquiry.reviewNotes),
    assignedStaffId: inquiry.assignedStaffId ?? null,
    documentCount: documents.length,
    documentRequirements,
    requestedDocumentTypes: Array.isArray(inquiry.requestedDocumentTypes)
      ? inquiry.requestedDocumentTypes.map(String)
      : [],
    outstandingDocumentTypes: Array.isArray(inquiry.outstandingDocumentTypes)
      ? inquiry.outstandingDocumentTypes.map(String)
      : [],
    documents,
    activities,
    createdAt: inquiry.createdAt ?? null,
    updatedAt: inquiry.updatedAt ?? null,
    reviewedAt: inquiry.reviewedAt ?? null,
    reviewedByUserId: inquiry.reviewedByUserId ?? null,
    paymentDueAt: inquiry.paymentDueAt ?? null,
    policyExpiryAt: inquiry.policyExpiryAt ?? null,
    renewalDueAt: inquiry.renewalDueAt ?? null,
  };
};

export const listInsuranceInquiries = async ({ accessToken, status, paymentStatus, renewalStatus } = {}) => {
  const inquiries = await request('/api/insurance/inquiries', {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
    query: {
      status,
      paymentStatus,
      renewalStatus,
    },
  });

  return Array.isArray(inquiries)
    ? inquiries.map((inquiry) => normalizeInsuranceInquiryForStaff(inquiry)).filter(Boolean)
    : [];
};

export const getInsuranceInquiryById = async ({ inquiryId, accessToken }) => {
  if (!inquiryId) {
    throw new ApiError('Select a queue item before loading inquiry detail.', 400, {
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

export const listInsuranceInquiriesByUserId = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError('Select a customer before loading insurance inquiries.', 400, {
      path: '/api/users/:id/insurance-inquiries',
    });
  }

  const inquiries = await request(`/api/users/${userId}/insurance-inquiries`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

  return Array.isArray(inquiries)
    ? inquiries.map((inquiry) => normalizeInsuranceInquiryForStaff(inquiry)).filter(Boolean)
    : [];
};

export const updateInsuranceInquiryStatus = async ({
  inquiryId,
  status,
  reviewNotes,
  customerMessage,
  expectedUpdatedAt,
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
        customerMessage: trimOrNull(customerMessage) ?? undefined,
        expectedUpdatedAt: trimOrNull(expectedUpdatedAt) ?? undefined,
      },
    }),
  );
};

export const getInsuranceDocumentFile = async ({ downloadRoute, accessToken }) => {
  const normalizedDownloadRoute = String(downloadRoute ?? '').trim()
  if (!normalizedDownloadRoute.startsWith('/api/insurance/documents/') || !normalizedDownloadRoute.endsWith('/file')) {
    throw new ApiError('Select an insurance document before opening it.', 400, {
      path: '/api/insurance/documents/:documentId/file',
    })
  }

  const response = await fetch(`${API_BASE_URL}${normalizedDownloadRoute}`, {
    method: 'GET',
    headers: {
      ...(buildAuthorizedHeaders(accessToken) ?? {}),
    },
  })

  if (!response.ok) {
    let data = null
    try {
      data = await response.clone().json()
    } catch {
      data = null
    }

    if (response.status === 401) {
      notifyStaffSessionUnauthorized({
        path: '/api/insurance/documents/:documentId/file',
        source: 'insuranceStaffClient',
      })
    }

    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, data)
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('content-type') ?? null,
    contentDisposition: response.headers.get('content-disposition') ?? null,
  }
}

export const createInsuranceRenewalFollowUp = async ({
  userId,
  vehicleId,
  inquiryType,
  subject,
  description,
  renewalDueAt,
  policyExpiryAt,
  providerName,
  policyNumber,
  assignedStaffId,
  notes,
  accessToken,
}) => {
  const normalizedPolicyExpiryAt = normalizeOptionalWorkflowValue(policyExpiryAt);
  const normalizedProviderName = normalizeOptionalWorkflowValue(providerName);
  const normalizedPolicyNumber = normalizeOptionalWorkflowValue(policyNumber);
  const normalizedAssignedStaffId = normalizeOptionalWorkflowValue(assignedStaffId);
  const normalizedNotes = normalizeOptionalWorkflowValue(notes);

  return normalizeInsuranceInquiryForStaff(
    await request('/api/insurance/renewals/follow-ups', {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        userId: trimRequiredRequestValue(userId),
        vehicleId: trimRequiredRequestValue(vehicleId),
        inquiryType,
        subject: trimRequiredRequestValue(subject),
        description: trimRequiredRequestValue(description),
        renewalDueAt: trimRequiredRequestValue(renewalDueAt),
        ...(normalizedPolicyExpiryAt !== undefined ? { policyExpiryAt: normalizedPolicyExpiryAt } : {}),
        ...(normalizedProviderName !== undefined ? { providerName: normalizedProviderName } : {}),
        ...(normalizedPolicyNumber !== undefined ? { policyNumber: normalizedPolicyNumber } : {}),
        ...(normalizedAssignedStaffId !== undefined ? { assignedStaffId: normalizedAssignedStaffId } : {}),
        ...(normalizedNotes !== undefined ? { notes: normalizedNotes } : {}),
      },
    }),
  );
};

export const updateInsuranceInquiryWorkflow = async ({
  inquiryId,
  status,
  documentStatus,
  paymentStatus,
  renewalStatus,
  paymentDueAt,
  policyExpiryAt,
  renewalDueAt,
  assignedStaffId,
  reviewNotes,
  customerMessage,
  requestedDocumentTypes,
  expectedUpdatedAt,
  accessToken,
}) => {
  if (!inquiryId) {
    throw new ApiError('Select an insurance inquiry before saving a workflow update.', 400, {
      path: '/api/insurance/inquiries/:id/workflow',
    });
  }

  const normalizedAssignedStaffId = normalizeOptionalWorkflowValue(assignedStaffId);
  const normalizedPaymentDueAt = normalizeOptionalWorkflowValue(paymentDueAt);
  const normalizedPolicyExpiryAt = normalizeOptionalWorkflowValue(policyExpiryAt);
  const normalizedRenewalDueAt = normalizeOptionalWorkflowValue(renewalDueAt);

  return normalizeInsuranceInquiryForStaff(
    await request(`/api/insurance/inquiries/${inquiryId}/workflow`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: {
        status,
        ...(documentStatus !== undefined ? { documentStatus } : {}),
        ...(paymentStatus !== undefined ? { paymentStatus } : {}),
        ...(renewalStatus !== undefined ? { renewalStatus } : {}),
        ...(normalizedPaymentDueAt !== undefined ? { paymentDueAt: normalizedPaymentDueAt } : {}),
        ...(normalizedPolicyExpiryAt !== undefined ? { policyExpiryAt: normalizedPolicyExpiryAt } : {}),
        ...(normalizedRenewalDueAt !== undefined ? { renewalDueAt: normalizedRenewalDueAt } : {}),
        ...(normalizedAssignedStaffId !== undefined ? { assignedStaffId: normalizedAssignedStaffId } : {}),
        reviewNotes: trimOrNull(reviewNotes) ?? undefined,
        customerMessage: trimOrNull(customerMessage) ?? undefined,
        ...(Array.isArray(requestedDocumentTypes) && requestedDocumentTypes.length
          ? { requestedDocumentTypes }
          : {}),
        expectedUpdatedAt: trimOrNull(expectedUpdatedAt) ?? undefined,
      },
    }),
  );
};

export const requestInsuranceInquiryDocuments = async ({
  inquiryId,
  documentTypes,
  customerMessage,
  reviewNotes,
  expectedUpdatedAt,
  accessToken,
}) => updateInsuranceInquiryWorkflow({
  inquiryId,
  status: 'needs_documents',
  requestedDocumentTypes: documentTypes,
  customerMessage,
  reviewNotes,
  expectedUpdatedAt,
  accessToken,
});

export const sendInsuranceReminders = async ({
  reminderType,
  targetMode,
  selectedIds,
  filters,
  accessToken,
}) =>
  request('/api/insurance/reminders/send', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: buildInsuranceReminderRequestBody({
      reminderType,
      targetMode,
      selectedIds,
      filters,
    }),
  });

export const sendInsuranceBroadcasts = async ({
  targetMode,
  selectedIds,
  filters,
  title,
  message,
  accessToken,
}) =>
  request('/api/insurance/broadcasts/send', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: buildInsuranceBroadcastRequestBody({
      targetMode,
      selectedIds,
      filters,
      title,
      message,
    }),
  });
