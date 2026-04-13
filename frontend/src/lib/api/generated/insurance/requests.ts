import type { RouteContract } from '../shared';

export type InsuranceInquiryType = 'ctpl' | 'comprehensive';
export type InsuranceInquiryStatus =
  | 'submitted'
  | 'under_review'
  | 'needs_documents'
  | 'approved_for_record'
  | 'rejected'
  | 'closed';

export interface CreateInsuranceInquiryRequest {
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  subject: string;
  description: string;
  providerName?: string;
  policyNumber?: string;
  notes?: string;
}

export interface UpdateInsuranceInquiryStatusRequest {
  status: InsuranceInquiryStatus;
  reviewNotes?: string;
}

export interface UploadInsuranceDocumentRequest {
  fileName: string;
  fileUrl: string;
  documentType: 'or_cr' | 'policy' | 'photo' | 'estimate' | 'other';
  notes?: string;
}

export const insuranceRoutes: Record<string, RouteContract> = {
  createInquiry: {
    method: 'POST',
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
    notes: 'Only service advisers and super admins can advance inquiry review status.',
  },
  uploadInquiryDocument: {
    method: 'POST',
    path: '/api/insurance/inquiries/:id/documents',
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
