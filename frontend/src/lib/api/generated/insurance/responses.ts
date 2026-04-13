import type { InsuranceInquiryStatus, InsuranceInquiryType } from './requests';

export interface InsuranceDocumentResponse {
  id: string;
  inquiryId: string;
  fileName: string;
  fileUrl: string;
  documentType: 'or_cr' | 'policy' | 'photo' | 'estimate' | 'other';
  notes?: string | null;
  uploadedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceInquiryResponse {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  subject: string;
  description: string;
  status: InsuranceInquiryStatus;
  providerName?: string | null;
  policyNumber?: string | null;
  notes?: string | null;
  reviewNotes?: string | null;
  createdByUserId: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  documents: InsuranceDocumentResponse[];
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
