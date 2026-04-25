import {
  insuranceRoutes,
  type InsuranceInquiryStatus,
  type InsuranceInquiryType,
  type UploadInsuranceDocumentRequest,
} from './requests';
import type {
  InsuranceDocumentResponse,
  InsuranceInquiryResponse,
  InsuranceRecordResponse,
} from './responses';

export type CustomerInsuranceIntakeState =
  | 'no_vehicle'
  | 'draft_ready'
  | 'submitting'
  | 'submitted_inquiry'
  | 'validation_error'
  | 'invalid_vehicle'
  | 'unauthorized_session'
  | 'submit_failed';

export type CustomerInsuranceTrackingState =
  | 'tracking_loading'
  | 'tracking_empty'
  | 'tracking_latest_inquiry'
  | 'tracking_vehicle_records'
  | 'tracking_not_found'
  | 'tracking_unauthorized_session'
  | 'tracking_load_failed';

export type CustomerInsuranceDocumentUploadState =
  | 'document_idle'
  | 'document_ready'
  | 'document_uploading'
  | 'document_uploaded'
  | 'document_validation_error'
  | 'document_closed'
  | 'document_missing_inquiry'
  | 'document_unauthorized'
  | 'document_forbidden'
  | 'document_failed';

export interface CustomerInsuranceIntakeStateRule {
  state: CustomerInsuranceIntakeState;
  surface: 'customer-mobile';
  truth: 'insurance-inquiry-route' | 'vehicle-ownership-gate' | 'client-guard';
  routeKey: 'createInquiry';
  description: string;
}

export interface CustomerInsuranceTrackingStateRule {
  state: CustomerInsuranceTrackingState;
  surface: 'customer-mobile';
  truth: 'insurance-inquiry-route' | 'insurance-record-route' | 'client-guard';
  routeKey: 'getInquiryById' | 'listVehicleInsuranceRecords';
  description: string;
}

export interface CustomerInsuranceDocumentUploadStateRule {
  state: CustomerInsuranceDocumentUploadState;
  surface: 'customer-mobile';
  truth: 'insurance-document-route' | 'client-guard';
  routeKey: 'uploadInquiryDocument';
  description: string;
}

export interface CustomerInsuranceDocumentPresentation {
  id: string;
  inquiryId: string;
  fileName: string;
  fileUrl: string;
  documentType: UploadInsuranceDocumentRequest['documentType'];
  documentTypeLabel: string;
  notes: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInsuranceInquiryPresentation {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  subject: string;
  description: string;
  statusValue: InsuranceInquiryStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  notes: string | null;
  documentCount: number;
  documents: CustomerInsuranceDocumentPresentation[];
  canAttachDocuments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInsuranceRecordPresentation {
  id: string;
  inquiryId: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  statusValue: InsuranceInquiryStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export const customerInsuranceDraftTemplate = {
  inquiryType: 'comprehensive' as InsuranceInquiryType,
  subject: '',
  description: '',
  providerName: '',
  policyNumber: '',
  notes: '',
};

export const customerInsuranceDocumentDraftTemplate: UploadInsuranceDocumentRequest = {
  documentType: 'photo',
  fileName: '',
  fileUrl: '',
  notes: '',
};

export const customerInsuranceStatusHints: Record<InsuranceInquiryStatus, string> = {
  submitted: 'Your inquiry is recorded and waiting for staff review.',
  under_review: 'A service adviser is currently reviewing the insurance request.',
  needs_documents: 'More documents are needed before staff can continue the request.',
  approved_for_record: 'The inquiry is approved for internal record tracking.',
  rejected: 'The inquiry cannot continue in its current state.',
  closed: 'The inquiry is closed and no longer accepting changes.',
};

export const customerInsuranceDocumentTypeLabels: Record<UploadInsuranceDocumentRequest['documentType'], string> = {
  or_cr: 'OR/CR',
  policy: 'Policy copy',
  photo: 'Damage photo',
  estimate: 'Repair estimate',
  other: 'Other document',
};

export const customerInsuranceDocumentTypeOptions = Object.entries(
  customerInsuranceDocumentTypeLabels,
).map(([value, label]) => ({
  value: value as UploadInsuranceDocumentRequest['documentType'],
  label,
}));

export const customerInsuranceIntakeStateRules: CustomerInsuranceIntakeStateRule[] = [
  {
    state: 'no_vehicle',
    surface: 'customer-mobile',
    truth: 'vehicle-ownership-gate',
    routeKey: 'createInquiry',
    description: 'Insurance intake cannot start until the customer has at least one owned vehicle.',
  },
  {
    state: 'draft_ready',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The customer can prepare an inquiry draft using a selected owned vehicle and documented fields only.',
  },
  {
    state: 'submitting',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The create inquiry request is currently in flight.',
  },
  {
    state: 'submitted_inquiry',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'The backend accepted the inquiry and returned the canonical inquiry status.',
  },
  {
    state: 'validation_error',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'The submitted inquiry payload is missing required documented fields or contains invalid values.',
  },
  {
    state: 'invalid_vehicle',
    surface: 'customer-mobile',
    truth: 'vehicle-ownership-gate',
    routeKey: 'createInquiry',
    description: 'The selected vehicle is missing, no longer exists, or does not belong to the customer.',
  },
  {
    state: 'unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The customer session is missing before intake can be submitted.',
  },
  {
    state: 'submit_failed',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'A non-classified network or API failure prevented inquiry creation.',
  },
];

export const customerInsuranceTrackingStateRules: CustomerInsuranceTrackingStateRule[] = [
  {
    state: 'tracking_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The mobile app is loading customer-safe claim-status data for the selected owned vehicle.',
  },
  {
    state: 'tracking_empty',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'No claim-status record or known inquiry is available yet for the selected vehicle.',
  },
  {
    state: 'tracking_latest_inquiry',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'getInquiryById',
    description: 'The mobile app is showing the latest known inquiry state using a specific inquiry id.',
  },
  {
    state: 'tracking_vehicle_records',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The selected vehicle already has one or more insurance record updates available for customer visibility.',
  },
  {
    state: 'tracking_not_found',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'getInquiryById',
    description: 'The requested inquiry id no longer exists or is not accessible to the current customer.',
  },
  {
    state: 'tracking_unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The customer session is missing before claim-status tracking can load.',
  },
  {
    state: 'tracking_load_failed',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'A non-classified network or API failure prevented claim-status data from loading.',
  },
];

export const customerInsuranceDocumentUploadStateRules: CustomerInsuranceDocumentUploadStateRule[] = [
  {
    state: 'document_idle',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'uploadInquiryDocument',
    description: 'No document draft is currently being uploaded for the selected inquiry.',
  },
  {
    state: 'document_ready',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'uploadInquiryDocument',
    description: 'The customer has started a document metadata draft using supported document types.',
  },
  {
    state: 'document_uploading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'uploadInquiryDocument',
    description: 'The supporting document metadata request is in flight.',
  },
  {
    state: 'document_uploaded',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'The backend accepted document metadata and returned the updated inquiry with document count.',
  },
  {
    state: 'document_validation_error',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'The document metadata is missing a required field or uses an unsupported document type.',
  },
  {
    state: 'document_closed',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'Closed or rejected inquiries cannot accept additional supporting documents.',
  },
  {
    state: 'document_missing_inquiry',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'The selected inquiry id is missing or no longer accessible.',
  },
  {
    state: 'document_unauthorized',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'uploadInquiryDocument',
    description: 'The customer session is missing before document metadata can be submitted.',
  },
  {
    state: 'document_forbidden',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'The current customer does not own the selected inquiry.',
  },
  {
    state: 'document_failed',
    surface: 'customer-mobile',
    truth: 'insurance-document-route',
    routeKey: 'uploadInquiryDocument',
    description: 'A non-classified API or network failure prevented document metadata upload.',
  },
];

export const buildCustomerInsuranceDocumentPresentation = (
  document: InsuranceDocumentResponse,
): CustomerInsuranceDocumentPresentation => ({
  id: document.id,
  inquiryId: document.inquiryId,
  fileName: document.fileName,
  fileUrl: document.fileUrl,
  documentType: document.documentType,
  documentTypeLabel: customerInsuranceDocumentTypeLabels[document.documentType],
  notes: document.notes ?? null,
  uploadedByUserId: document.uploadedByUserId ?? null,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

export const buildCustomerInsuranceInquiryPresentation = (
  inquiry: InsuranceInquiryResponse,
): CustomerInsuranceInquiryPresentation => {
  const documents = Array.isArray(inquiry.documents)
    ? inquiry.documents.map(buildCustomerInsuranceDocumentPresentation)
    : [];

  return {
    id: inquiry.id,
    userId: inquiry.userId,
    vehicleId: inquiry.vehicleId,
    inquiryType: inquiry.inquiryType,
    subject: inquiry.subject,
    description: inquiry.description,
    statusValue: inquiry.status,
    statusHint: customerInsuranceStatusHints[inquiry.status],
    providerName: inquiry.providerName ?? null,
    policyNumber: inquiry.policyNumber ?? null,
    notes: inquiry.notes ?? null,
    documentCount: documents.length,
    documents,
    canAttachDocuments: !['closed', 'rejected'].includes(inquiry.status),
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
};

export const buildCustomerInsuranceRecordPresentation = (
  record: InsuranceRecordResponse,
): CustomerInsuranceRecordPresentation => ({
  id: record.id,
  inquiryId: record.inquiryId,
  userId: record.userId,
  vehicleId: record.vehicleId,
  inquiryType: record.inquiryType,
  statusValue: record.status,
  statusHint: customerInsuranceStatusHints[record.status],
  providerName: record.providerName ?? null,
  policyNumber: record.policyNumber ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const getCustomerInsuranceTrackingState = ({
  latestInquiry,
  records,
}: {
  latestInquiry: CustomerInsuranceInquiryPresentation | null;
  records: CustomerInsuranceRecordPresentation[];
}): Extract<
  CustomerInsuranceTrackingState,
  'tracking_empty' | 'tracking_latest_inquiry' | 'tracking_vehicle_records'
> => {
  if (records.length) {
    return 'tracking_vehicle_records';
  }

  if (latestInquiry) {
    return 'tracking_latest_inquiry';
  }

  return 'tracking_empty';
};

export const customerInsuranceContractSources = {
  createInquiry: insuranceRoutes.createInquiry,
  getInquiryById: insuranceRoutes.getInquiryById,
  uploadInquiryDocument: insuranceRoutes.uploadInquiryDocument,
  listVehicleInsuranceRecords: insuranceRoutes.listVehicleInsuranceRecords,
} as const;
