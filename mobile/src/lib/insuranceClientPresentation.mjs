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

export const customerInsuranceDocumentTypeLabels = {
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
const REFERENCE_UNAVAILABLE = 'Reference unavailable';

export const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

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

export const createInitialCustomerInsuranceDraft = () => ({
  clientRequestId: createCustomerInsuranceRequestId(),
  requestStageIndex: 0,
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
    inquiryReference: trimOrNull(inquiry.inquiryReference),
    referenceLabel: trimOrNull(inquiry.inquiryReference) ?? REFERENCE_UNAVAILABLE,
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
