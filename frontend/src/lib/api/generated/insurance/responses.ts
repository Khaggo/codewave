import type {
  InsuranceCasePurpose,
  InsuranceDocumentReviewStatus,
  InsuranceDocumentType,
  InsuranceInquiryStatus,
  InsuranceInquiryType,
  InsurancePaymentStatus,
  InsuranceRenewalStatus,
} from './requests';

export interface InsuranceDocumentResponse {
  id: string;
  inquiryId: string;
  fileName: string;
  fileUrl: string;
  documentType: InsuranceDocumentType;
  notes?: string | null;
  uploadedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceActivityResponse {
  id: string;
  action: string;
  documentType?: InsuranceDocumentType | null;
  actorUserId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceInquiryResponse {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  purpose: InsuranceCasePurpose;
  subject: string;
  description: string;
  status: InsuranceInquiryStatus;
  documentStatus: InsuranceDocumentReviewStatus;
  paymentStatus: InsurancePaymentStatus;
  renewalStatus: InsuranceRenewalStatus;
  providerName?: string | null;
  policyNumber?: string | null;
  notes?: string | null;
  reviewNotes?: string | null;
  assignedStaffId?: string | null;
  customerDisplayName?: string;
  vehicleLabel?: string;
  createdByUserId: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  paymentDueAt?: string | null;
  policyExpiryAt?: string | null;
  renewalDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  documents: InsuranceDocumentResponse[];
  activities: InsuranceActivityResponse[];
}

export interface InsuranceRecordResponse {
  id: string;
  vehicleId: string;
  userId: string;
  inquiryId: string;
  inquiryType: InsuranceInquiryType;
  providerName?: string | null;
  policyNumber?: string | null;
  status: InsuranceInquiryStatus;
  createdAt: string;
  updatedAt: string;
}
