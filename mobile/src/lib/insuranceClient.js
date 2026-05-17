const INSURANCE_REQUEST_TIMEOUT_MS = 8000;
const INSURANCE_CLIENT_RUNTIME_KEY = '__insuranceClientRuntime';

let insuranceClientRuntimePromise = null;

const customerInsuranceStatusHints = {
  submitted: 'Your inquiry is recorded and waiting for staff review.',
  under_review: 'A service adviser is currently reviewing the insurance request.',
  needs_documents: 'More documents are needed before staff can continue the request.',
  for_approval: 'The inquiry is waiting for final approval.',
  approved: 'The inquiry is approved and may move into payment, activation, or renewal follow-up next.',
  payment_pending: 'A payment step is still in progress for this inquiry.',
  active: 'The insurance request is active and no longer waiting on intake review.',
  for_renewal: 'The inquiry is now waiting on renewal follow-up.',
  rejected: 'The inquiry cannot continue in its current state.',
  closed: 'The inquiry is closed and no longer accepting changes.',
  cancelled: 'The inquiry was cancelled before completion.',
};

const customerInsuranceDocumentTypeLabels = {
  or_cr: 'OR/CR',
  policy: 'Policy copy',
  valid_id: 'Valid ID',
  police_report: 'Police report',
  photo: 'Damage photo',
  estimate: 'Repair estimate',
  proof_of_payment: 'Proof of payment',
  other: 'Other document',
};

const closedDocumentUploadStatuses = ['closed', 'rejected'];

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getInsuranceClientRuntime = async () => {
  if (globalThis[INSURANCE_CLIENT_RUNTIME_KEY]) {
    return globalThis[INSURANCE_CLIENT_RUNTIME_KEY];
  }

  if (!insuranceClientRuntimePromise) {
    insuranceClientRuntimePromise = import('./authClient.js');
  }

  return insuranceClientRuntimePromise;
};

const request = async (path, options = {}) => {
  const { ApiError, getApiBaseUrl, notifyCustomerSessionExpired } = await getInsuranceClientRuntime();
  const API_BASE_URL = getApiBaseUrl();
  const {
    body,
    headers,
    timeoutMs = INSURANCE_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: isFormData
          ? { ...(headers ?? {}) }
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
        if (response.status === 401) {
          notifyCustomerSessionExpired({
            path,
            source: 'insuranceClient',
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

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
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
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
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

const buildCustomerInsuranceStatusHint = (status) =>
  customerInsuranceStatusHints[status] ?? 'Insurance tracking is available for this request.';

const humanizeInquiryType = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const humanizeDocumentType = (value) =>
  customerInsuranceDocumentTypeLabels[value] ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const customerInsuranceDocumentTypeOptions = Object.entries(
  customerInsuranceDocumentTypeLabels,
).map(([value, label]) => ({
  value,
  label,
}));

export const buildOwnedVehicleInsuranceLabel = (vehicle) => {
  const displayName = String(vehicle?.displayName ?? '').trim();
  const plateNumber = String(vehicle?.plateNumber ?? '').trim().toUpperCase();

  if (displayName && plateNumber) {
    return `${displayName} • ${plateNumber}`;
  }

  return displayName || plateNumber || 'Owned vehicle';
};

export const createInitialCustomerInsuranceDraft = () => ({
  purpose: 'claim',
  inquiryType: 'comprehensive',
  description: '',
  providerName: '',
  policyNumber: '',
  notes: '',
  renewalPolicyMode: 'reuse',
});

export const createInitialCustomerInsuranceDocumentDraft = () => ({
  documentType: 'photo',
  fileName: '',
  fileUrl: '',
  notes: '',
});

export const canAttachCustomerInsuranceDocument = (inquiry) =>
  Boolean(inquiry?.id) && !closedDocumentUploadStatuses.includes(inquiry?.status);

export const normalizeCustomerInsuranceDocument = (document) => {
  if (!document || typeof document !== 'object') {
    return null;
  }

  return {
    id: document.id ?? null,
    inquiryId: document.inquiryId ?? null,
    fileName: String(document.fileName ?? '').trim(),
    fileUrl: String(document.fileUrl ?? '').trim(),
    documentType: document.documentType ?? 'other',
    documentTypeLabel: humanizeDocumentType(document.documentType),
    notes: trimOrNull(document.notes),
    uploadedByUserId: document.uploadedByUserId ?? null,
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt ?? null,
  };
};

export const normalizeCustomerInsuranceInquiry = (inquiry) => {
  if (!inquiry || typeof inquiry !== 'object') {
    return null;
  }

  const documents = asArray(inquiry.documents)
    .map(normalizeCustomerInsuranceDocument)
    .filter(Boolean);

  return {
    id: inquiry.id ?? null,
    userId: inquiry.userId ?? null,
    vehicleId: inquiry.vehicleId ?? null,
    inquiryType: inquiry.inquiryType ?? 'comprehensive',
    inquiryTypeLabel: humanizeInquiryType(inquiry.inquiryType),
    purpose: inquiry.purpose ?? 'quotation',
    subject: String(inquiry.subject ?? '').trim(),
    description: String(inquiry.description ?? '').trim(),
    status: inquiry.status ?? 'submitted',
    statusHint: buildCustomerInsuranceStatusHint(inquiry.status),
    documentStatus: inquiry.documentStatus ?? 'incomplete',
    paymentStatus: inquiry.paymentStatus ?? 'not_required',
    renewalStatus: inquiry.renewalStatus ?? 'not_applicable',
    providerName: trimOrNull(inquiry.providerName),
    policyNumber: trimOrNull(inquiry.policyNumber),
    notes: trimOrNull(inquiry.notes),
    reviewNotes: trimOrNull(inquiry.reviewNotes),
    paymentDueAt: inquiry.paymentDueAt ?? null,
    policyExpiryAt: inquiry.policyExpiryAt ?? null,
    renewalDueAt: inquiry.renewalDueAt ?? null,
    documentCount: documents.length,
    documents,
    canAttachDocuments: !closedDocumentUploadStatuses.includes(inquiry.status),
    createdAt: inquiry.createdAt ?? null,
    updatedAt: inquiry.updatedAt ?? null,
  };
};

export const normalizeCustomerInsuranceRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return {
    id: record.id ?? null,
    inquiryId: record.inquiryId ?? null,
    userId: record.userId ?? null,
    vehicleId: record.vehicleId ?? null,
    inquiryType: record.inquiryType ?? 'comprehensive',
    inquiryTypeLabel: humanizeInquiryType(record.inquiryType),
    status: record.status ?? 'submitted',
    statusHint: buildCustomerInsuranceStatusHint(record.status),
    providerName: trimOrNull(record.providerName),
    policyNumber: trimOrNull(record.policyNumber),
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
};

export const getCustomerInsuranceTrackingState = ({
  latestInquiry,
  claimStatusUpdates,
}) => {
  if (claimStatusUpdates.length) {
    return 'tracking_vehicle_records';
  }

  if (latestInquiry) {
    return 'tracking_latest_inquiry';
  }

  return 'tracking_empty';
};

export const createEmptyCustomerInsuranceSnapshot = ({
  hasSession = false,
  ownedVehicles = [],
} = {}) => ({
  intakeState: hasSession
    ? ownedVehicles.length
      ? 'draft_ready'
      : 'no_vehicle'
    : 'unauthorized_session',
  trackingState: hasSession ? 'tracking_empty' : 'tracking_unauthorized_session',
  latestInquiry: null,
  claimStatusUpdates: [],
});

export const createInsuranceInquiry = async ({
  userId,
  vehicleId,
  purpose,
  inquiryType,
  subject,
  description,
  providerName,
  policyNumber,
  notes,
  accessToken,
}) => {
  const { ApiError } = await getInsuranceClientRuntime();

  if (!userId) {
    throw new ApiError(
      'You need an active customer session before starting an insurance inquiry.',
      401,
      {
        path: '/api/insurance/inquiries',
      },
    );
  }

  if (!vehicleId) {
    throw new ApiError('Select an owned vehicle before starting an insurance inquiry.', 409, {
      path: '/api/insurance/inquiries',
    });
  }

  return normalizeCustomerInsuranceInquiry(
    await request('/api/insurance/inquiries', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: {
        userId,
        vehicleId,
        inquiryType,
        purpose: trimOrNull(purpose) ?? 'quotation',
        subject: String(subject ?? '').trim(),
        description: String(description ?? '').trim(),
        providerName: trimOrNull(providerName) ?? undefined,
        policyNumber: trimOrNull(policyNumber) ?? undefined,
        notes: trimOrNull(notes) ?? undefined,
      },
    }),
  );
};

export const getInsuranceInquiryById = async ({ inquiryId, accessToken }) => {
  const { ApiError } = await getInsuranceClientRuntime();

  if (!inquiryId) {
    throw new ApiError('A known inquiry id is required before loading claim status.', 400, {
      path: '/api/insurance/inquiries/:id',
    });
  }

  return normalizeCustomerInsuranceInquiry(
    await request(`/api/insurance/inquiries/${inquiryId}`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  );
};

export const addInsuranceInquiryDocument = async ({
  inquiryId,
  documentType,
  fileName,
  fileUrl,
  notes,
  accessToken,
}) => {
  const { ApiError } = await getInsuranceClientRuntime();
  const normalizedInquiryId = String(inquiryId ?? '').trim();
  const normalizedDocumentType = String(documentType ?? '').trim();
  const normalizedFileName = String(fileName ?? '').trim();
  const normalizedFileUrl = String(fileUrl ?? '').trim();

  if (!normalizedInquiryId) {
    throw new ApiError('Submit or select an insurance inquiry before attaching a document.', 400, {
      path: '/api/insurance/inquiries/:id/documents',
    });
  }

  if (!customerInsuranceDocumentTypeLabels[normalizedDocumentType]) {
    throw new ApiError(
      'Choose a valid document type: OR/CR, policy, valid ID, police report, photo, estimate, proof of payment, or other.',
      400,
      {
        path: '/api/insurance/inquiries/:id/documents',
        documentType,
      },
    );
  }

  if (!normalizedFileName || !normalizedFileUrl) {
    throw new ApiError('Document name and file URL/reference are required before upload.', 400, {
      path: '/api/insurance/inquiries/:id/documents',
    });
  }

  return normalizeCustomerInsuranceInquiry(
    await request(`/api/insurance/inquiries/${normalizedInquiryId}/documents`, {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: {
        fileName: normalizedFileName,
        fileUrl: normalizedFileUrl,
        documentType: normalizedDocumentType,
        notes: trimOrNull(notes) ?? undefined,
      },
    }),
  );
};

export const uploadInsuranceInquiryDocumentFile = async ({
  inquiryId,
  documentType,
  file,
  notes,
  accessToken,
}) => {
  const { ApiError } = await getInsuranceClientRuntime();
  const normalizedInquiryId = String(inquiryId ?? '').trim();
  const normalizedDocumentType = String(documentType ?? '').trim();

  if (!normalizedInquiryId) {
    throw new ApiError('Submit or select an insurance inquiry before attaching a document.', 400, {
      path: '/api/insurance/inquiries/:id/documents/upload',
    });
  }

  if (!customerInsuranceDocumentTypeLabels[normalizedDocumentType]) {
    throw new ApiError(
      'Choose a valid document type before uploading a supporting file.',
      400,
      {
        path: '/api/insurance/inquiries/:id/documents/upload',
        documentType,
      },
    );
  }

  if (!file) {
    throw new ApiError('Choose a file before uploading an insurance document.', 400, {
      path: '/api/insurance/inquiries/:id/documents/upload',
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', normalizedDocumentType);
  if (trimOrNull(notes)) {
    formData.append('notes', trimOrNull(notes));
  }

  return normalizeCustomerInsuranceInquiry(
    await request(`/api/insurance/inquiries/${normalizedInquiryId}/documents/upload`, {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: formData,
    }),
  );
};

export const listVehicleInsuranceRecords = async ({ vehicleId, accessToken }) => {
  const { ApiError } = await getInsuranceClientRuntime();

  if (!vehicleId) {
    throw new ApiError(
      'Select an owned vehicle before loading insurance tracking updates.',
      400,
      {
        path: '/api/vehicles/:id/insurance-records',
      },
    );
  }

  return asArray(
    await request(`/api/vehicles/${vehicleId}/insurance-records`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  )
    .map(normalizeCustomerInsuranceRecord)
    .filter(Boolean);
};
