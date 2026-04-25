import type { StaffPortalRole } from '../auth/staff-web-session';
import type { RouteContract } from '../shared';
import { insuranceRoutes, type InsuranceInquiryStatus, type UpdateInsuranceInquiryStatusRequest } from './requests';
import type { InsuranceDocumentResponse, InsuranceInquiryResponse } from './responses';

export type StaffInsuranceQueueState =
  | 'queue_loaded'
  | 'queue_empty'
  | 'detail_loaded'
  | 'forbidden_role'
  | 'load_failed';

export type StaffInsuranceStatusUpdateState =
  | 'status_update_ready'
  | 'status_update_submitting'
  | 'status_update_saved'
  | 'forbidden_role'
  | 'inquiry_not_found'
  | 'invalid_transition'
  | 'update_failed';

export interface StaffInsuranceQueueStateRule {
  state: StaffInsuranceQueueState;
  surface: 'staff-admin-web';
  truth: 'planned-review-read-model' | 'synchronous-insurance-record' | 'client-guard';
  routeKey: 'listInsuranceReviewQueue' | 'getInquiryById';
  allowedRoles: StaffPortalRole[];
  description: string;
}

export interface StaffInsuranceStatusUpdateStateRule {
  state: StaffInsuranceStatusUpdateState;
  surface: 'staff-admin-web';
  truth: 'synchronous-insurance-record' | 'client-guard';
  routeKey: 'updateInquiryStatus';
  allowedRoles: StaffPortalRole[];
  description: string;
}

export interface StaffInsuranceQueueItemPresentation {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryResponse['inquiryType'];
  subject: string;
  description: string;
  status: InsuranceInquiryStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  documentCount: number;
  documents: InsuranceDocumentResponse[];
}

export interface StaffInsuranceStatusUpdateDraft {
  inquiryId: string;
  request: UpdateInsuranceInquiryStatusRequest;
  editableFields: Array<'status' | 'reviewNotes'>;
}

export const insuranceReviewStaffRoles: StaffPortalRole[] = [
  'service_adviser',
  'super_admin',
];

export const insuranceStatusHints: Record<InsuranceInquiryStatus, string> = {
  submitted: 'New customer intake waiting for staff review.',
  under_review: 'A service adviser is currently validating the inquiry and evidence.',
  needs_documents: 'The customer must add more supporting files before the inquiry can continue.',
  approved_for_record: 'The inquiry is approved for internal tracking record creation.',
  rejected: 'The inquiry cannot continue in its current form.',
  closed: 'The inquiry is closed and no longer accepts workflow updates.',
};

export const insuranceStatusTransitions: Record<InsuranceInquiryStatus, InsuranceInquiryStatus[]> = {
  submitted: ['under_review', 'needs_documents', 'rejected'],
  under_review: ['needs_documents', 'approved_for_record', 'rejected', 'closed'],
  needs_documents: ['under_review', 'approved_for_record', 'rejected', 'closed'],
  approved_for_record: ['closed'],
  rejected: ['closed'],
  closed: [],
};

export const staffInsuranceQueueRoute: RouteContract = {
  method: 'GET',
  path: '/api/insurance/review-queue',
  status: 'planned',
  source: 'task',
  notes:
    'The staff queue is still a planned read model. Current web work must keep queue items mock-backed until the backend exposes a list endpoint.',
};

export const staffInsuranceQueueStateRules: StaffInsuranceQueueStateRule[] = [
  {
    state: 'queue_loaded',
    surface: 'staff-admin-web',
    truth: 'planned-review-read-model',
    routeKey: 'listInsuranceReviewQueue',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The staff queue shows one or more insurance inquiries waiting for review or status follow-up.',
  },
  {
    state: 'queue_empty',
    surface: 'staff-admin-web',
    truth: 'planned-review-read-model',
    routeKey: 'listInsuranceReviewQueue',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'No insurance inquiries currently appear in the planned staff review queue.',
  },
  {
    state: 'detail_loaded',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'getInquiryById',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The selected insurance inquiry detail is available for adviser/admin review.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'getInquiryById',
    allowedRoles: [],
    description: 'Technicians and non-staff roles must not use the insurance review workspace.',
  },
  {
    state: 'load_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'getInquiryById',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'A non-classified API or network failure blocked insurance detail loading.',
  },
];

export const staffInsuranceStatusUpdateStateRules: StaffInsuranceStatusUpdateStateRule[] = [
  {
    state: 'status_update_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The selected inquiry is ready for a valid status update using status and review notes only.',
  },
  {
    state: 'status_update_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The status update request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'status_update_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The backend accepted the new inquiry status and returned the updated inquiry.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateInquiryStatus',
    allowedRoles: [],
    description: 'Only service advisers and super admins may update inquiry review status.',
  },
  {
    state: 'inquiry_not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The selected insurance inquiry no longer exists or cannot be found.',
  },
  {
    state: 'invalid_transition',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: "The requested review transition is not valid for the inquiry's current backend status.",
  },
  {
    state: 'update_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'A non-classified API or network failure blocked the status update.',
  },
];

export const buildStaffInsuranceQueueItem = (
  inquiry: InsuranceInquiryResponse,
): StaffInsuranceQueueItemPresentation => ({
  id: inquiry.id,
  userId: inquiry.userId,
  vehicleId: inquiry.vehicleId,
  inquiryType: inquiry.inquiryType,
  subject: inquiry.subject,
  description: inquiry.description,
  status: inquiry.status,
  statusHint: insuranceStatusHints[inquiry.status],
  providerName: inquiry.providerName ?? null,
  policyNumber: inquiry.policyNumber ?? null,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
  notes: inquiry.notes ?? null,
  documentCount: Array.isArray(inquiry.documents) ? inquiry.documents.length : 0,
  documents: Array.isArray(inquiry.documents) ? inquiry.documents : [],
});

export const getStaffInsuranceQueueState = (
  inquiries: StaffInsuranceQueueItemPresentation[],
): Extract<StaffInsuranceQueueState, 'queue_loaded' | 'queue_empty'> =>
  inquiries.length ? 'queue_loaded' : 'queue_empty';

export const getAllowedInsuranceStatusTargets = (
  status: InsuranceInquiryStatus,
): InsuranceInquiryStatus[] => insuranceStatusTransitions[status] ?? [];

export const getSelectedInsuranceQueueItem = (
  inquiries: StaffInsuranceQueueItemPresentation[],
  inquiryId?: string | null,
): StaffInsuranceQueueItemPresentation | null => {
  if (inquiryId) {
    const selected = inquiries.find((inquiry) => inquiry.id === inquiryId);
    if (selected) {
      return selected;
    }
  }

  return inquiries[0] ?? null;
};

export const insuranceStatusUpdateDraftTemplate: StaffInsuranceStatusUpdateDraft = {
  inquiryId: 'insurance-inquiry-id',
  request: {
    status: 'under_review',
    reviewNotes: 'Checking the submitted files before the next review action.',
  },
  editableFields: ['status', 'reviewNotes'],
};

export const staffInsuranceContractSources = {
  queue: staffInsuranceQueueRoute,
  detail: insuranceRoutes.getInquiryById,
  update: insuranceRoutes.updateInquiryStatus,
  documents: insuranceRoutes.uploadInquiryDocument,
} as const;
