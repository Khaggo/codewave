import {
  buildAuthHeaders,
  getInsuranceClientRuntime,
  request,
} from './insuranceTransport.js';

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

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export const createCustomerInsuranceRequestId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = token === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
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
  clientRequestId: createCustomerInsuranceRequestId(),
  purpose: 'claim',
  inquiryType: 'comprehensive',
  description: '',
  providerName: '',
  policyNumber: '',
  incidentOccurredAt: '',
  incidentLocation: '',
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
    fileName: String(document.fileName ?? '').trim(),
    fileUrl: String(document.fileUrl ?? '').trim(),
    documentType: document.documentType ?? 'other',
    documentTypeLabel: humanizeDocumentType(document.documentType),
    notes: trimOrNull(document.notes),
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt ?? null,
  };
};

export const normalizeCustomerInsuranceActivity = (activity) => {
  if (!activity || typeof activity !== 'object') {
    return null;
  }

  return {
    action: String(activity.action ?? '').trim(),
    documentType: trimOrNull(activity.documentType),
    customerMessage: trimOrNull(activity.customerMessage),
    createdAt: activity.createdAt ?? null,
  };
};

export const normalizeCustomerInsuranceInquiry = (inquiry) => {
  if (!inquiry || typeof inquiry !== 'object') {
    return null;
  }

  const documents = asArray(inquiry.documents)
    .map(normalizeCustomerInsuranceDocument)
    .filter(Boolean);
  const activities = asArray(inquiry.activities)
    .map(normalizeCustomerInsuranceActivity)
    .filter(Boolean);
  const latestCustomerMessage =
    [...activities]
      .reverse()
      .find((activity) => activity.customerMessage)?.customerMessage ?? null;

  return {
    id: inquiry.id ?? null,
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
    incidentOccurredAt: inquiry.incidentOccurredAt ?? null,
    incidentLocation: trimOrNull(inquiry.incidentLocation),
    notes: trimOrNull(inquiry.notes),
    latestCustomerMessage,
    paymentDueAt: inquiry.paymentDueAt ?? null,
    policyExpiryAt: inquiry.policyExpiryAt ?? null,
    renewalDueAt: inquiry.renewalDueAt ?? null,
    documentCount: documents.length,
    documents,
    activities,
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
  clientRequestId,
  purpose,
  inquiryType,
  subject,
  description,
  providerName,
  policyNumber,
  incidentOccurredAt,
  incidentLocation,
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
        clientRequestId: trimOrNull(clientRequestId) ?? createCustomerInsuranceRequestId(),
        inquiryType,
        purpose: trimOrNull(purpose) ?? 'quotation',
        subject: String(subject ?? '').trim(),
        description: String(description ?? '').trim(),
        providerName: trimOrNull(providerName) ?? undefined,
        policyNumber: trimOrNull(policyNumber) ?? undefined,
        incidentOccurredAt: trimOrNull(incidentOccurredAt) ?? undefined,
        incidentLocation: trimOrNull(incidentLocation) ?? undefined,
        notes: trimOrNull(notes) ?? undefined,
      },
    }),
  );
};

export const listMyInsuranceInquiries = async ({
  vehicleId,
  status,
  cursor,
  limit = 20,
  accessToken,
}) => {
  const query = [
    vehicleId ? `vehicleId=${encodeURIComponent(vehicleId)}` : '',
    status ? `status=${encodeURIComponent(status)}` : '',
    cursor ? `cursor=${encodeURIComponent(cursor)}` : '',
    `limit=${Math.min(50, Math.max(1, Number(limit) || 20))}`,
  ]
    .filter(Boolean)
    .join('&');
  const response = await request(`/api/insurance/inquiries/mine?${query}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return {
    items: asArray(response?.items)
      .map(normalizeCustomerInsuranceInquiry)
      .filter(Boolean),
    page: {
      limit: Number(response?.page?.limit) || limit,
      hasNext: Boolean(response?.page?.hasNext),
      nextCursor: trimOrNull(response?.page?.nextCursor),
    },
  };
};

export const getInsuranceRequirements = async ({
  purpose,
  inquiryType,
  accessToken,
}) => {
  const query = [
    `purpose=${encodeURIComponent(purpose || 'quotation')}`,
    inquiryType ? `inquiryType=${encodeURIComponent(inquiryType)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  const response = await request(`/api/insurance/requirements?${query}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return {
    purpose: response?.purpose ?? purpose ?? 'quotation',
    inquiryType: response?.inquiryType ?? inquiryType ?? null,
    requiredDocumentTypes: asArray(response?.requiredDocumentTypes),
    optionalDocumentTypes: asArray(response?.optionalDocumentTypes),
  };
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
