import type { RouteContract } from '../shared';

export type InsuranceInquiryType = 'ctpl' | 'comprehensive';

export type InsuranceCasePurpose =
  | 'new_application'
  | 'renewal'
  | 'claim'
  | 'quotation';

export type InsuranceInquiryStatus =
  | 'submitted'
  | 'needs_documents'
  | 'under_review'
  | 'for_approval'
  | 'approved'
  | 'payment_pending'
  | 'active'
  | 'for_renewal'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export type InsuranceDocumentReviewStatus =
  | 'complete'
  | 'incomplete'
  | 'under_verification'
  | 'rejected';

export type InsuranceDocumentType =
  | 'or_cr'
  | 'policy'
  | 'valid_id'
  | 'police_report'
  | 'photo'
  | 'estimate'
  | 'proof_of_payment'
  | 'other';

export type InsurancePaymentStatus =
  | 'not_required'
  | 'unpaid'
  | 'proof_submitted'
  | 'verifying'
  | 'paid'
  | 'overdue';

export type InsuranceRenewalStatus =
  | 'not_applicable'
  | 'upcoming'
  | 'quoted'
  | 'awaiting_customer'
  | 'renewed'
  | 'expired';

export interface ListInsuranceInquiriesRequest {
  status?: InsuranceInquiryStatus;
  paymentStatus?: InsurancePaymentStatus;
  renewalStatus?: InsuranceRenewalStatus;
}

export interface CreateInsuranceInquiryRequest {
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  purpose?: InsuranceCasePurpose;
  subject: string;
  description: string;
  providerName?: string;
  policyNumber?: string;
  notes?: string;
}

export interface UpdateInsuranceInquiryWorkflowRequest {
  status: InsuranceInquiryStatus;
  documentStatus?: InsuranceDocumentReviewStatus;
  paymentStatus?: InsurancePaymentStatus;
  renewalStatus?: InsuranceRenewalStatus;
  paymentDueAt?: string;
  policyExpiryAt?: string;
  renewalDueAt?: string;
  assignedStaffId?: string;
  reviewNotes?: string;
}

export interface UpdateInsuranceInquiryStatusRequest
  extends UpdateInsuranceInquiryWorkflowRequest {}

export interface UploadInsuranceDocumentRequest {
  fileName: string;
  fileUrl: string;
  documentType: InsuranceDocumentType;
  notes?: string;
}

export interface UploadInsuranceDocumentFileRequest {
  documentType: InsuranceDocumentType;
  notes?: string;
}

export const insuranceRoutes: Record<string, RouteContract> = {
  createInquiry: {
    method: 'POST',
    path: '/api/insurance/inquiries',
    status: 'live',
    source: 'swagger',
  },
  listInsuranceInquiries: {
    method: 'GET',
    path: '/api/insurance/inquiries',
    status: 'live',
    source: 'swagger',
  },
  getInquiryById: {
    method: 'GET',
    path: '/api/insurance/inquiries/:id',
    status: 'live',
    source: 'swagger',
  },
  updateInquiryStatus: {
    method: 'PATCH',
    path: '/api/insurance/inquiries/:id/status',
    status: 'live',
    source: 'swagger',
    notes: 'Only service advisers and super admins can advance inquiry workflow and follow-up tags.',
  },
  uploadInquiryDocument: {
    method: 'POST',
    path: '/api/insurance/inquiries/:id/documents',
    status: 'live',
    source: 'swagger',
  },
  uploadInquiryDocumentFile: {
    method: 'POST',
    path: '/api/insurance/inquiries/:id/documents/upload',
    status: 'live',
    source: 'swagger',
  },
  listVehicleInsuranceRecords: {
    method: 'GET',
    path: '/api/vehicles/:id/insurance-records',
    status: 'live',
    source: 'swagger',
  },
};
