import {
  buildAuthHeaders,
  getInsuranceClientRuntime,
  request,
} from './insuranceTransport.js';

import {
  asArray,
  createCustomerInsuranceRequestId,
  customerInsuranceDocumentTypeLabels,
  normalizeCustomerInsuranceInquiry,
  normalizeCustomerInsuranceRecord,
  trimOrNull,
} from './insuranceClientPresentation.mjs';

export {
  canAttachCustomerInsuranceDocument,
  createCustomerInsuranceRequestId,
  createEmptyCustomerInsuranceSnapshot,
  createInitialCustomerInsuranceDocumentDraft,
  createInitialCustomerInsuranceDraft,
  customerInsuranceDocumentTypeLabels,
  customerInsuranceDocumentTypeOptions,
  getCustomerInsuranceTrackingState,
  normalizeCustomerInsuranceActivity,
  normalizeCustomerInsuranceDocument,
  normalizeCustomerInsuranceInquiry,
  normalizeCustomerInsuranceRecord,
} from './insuranceClientPresentation.mjs';

export const buildOwnedVehicleInsuranceLabel = (vehicle) => {
  const displayName = String(vehicle?.displayName ?? '').trim();
  const plateNumber = String(vehicle?.plateNumber ?? '').trim().toUpperCase();

  if (displayName && plateNumber) {
    return `${displayName} • ${plateNumber}`;
  }

  return displayName || plateNumber || 'Owned vehicle';
};

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
  signal,
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
    signal,
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

export const getInsuranceInquiryById = async ({ inquiryId, accessToken, signal }) => {
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
      signal,
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
  const webFile =
    typeof Blob !== 'undefined' && file?.webFile instanceof Blob
      ? file.webFile
      : null;

  if (webFile) {
    formData.append('file', webFile, String(file?.name ?? 'insurance-document'));
  } else {
    formData.append('file', file);
  }
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

export const listVehicleInsuranceRecords = async ({ vehicleId, accessToken, signal }) => {
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
      signal,
    }),
  )
    .map(normalizeCustomerInsuranceRecord)
    .filter(Boolean);
};
