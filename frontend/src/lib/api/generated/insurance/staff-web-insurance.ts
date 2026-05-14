import type { StaffPortalRole } from '../auth/staff-web-session';
import type { RouteContract } from '../shared';
import {
  insuranceRoutes,
  type InsuranceDocumentReviewStatus,
  type InsuranceInquiryStatus,
  type InsurancePaymentStatus,
  type InsuranceRenewalStatus,
  type UpdateInsuranceInquiryStatusRequest,
} from './requests';
import type {
  InsuranceDocumentResponse,
  InsuranceInquiryResponse,
} from './responses';

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
  truth: 'staff-list-read-model' | 'synchronous-insurance-record' | 'client-guard';
  routeKey: 'listInsuranceInquiries' | 'getInquiryById';
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
  purpose: InsuranceInquiryResponse['purpose'];
  subject: string;
  description: string;
  customerDisplayName: string;
  vehicleLabel: string;
  status: InsuranceInquiryStatus;
  documentStatus: InsuranceDocumentReviewStatus;
  paymentStatus: InsurancePaymentStatus;
  renewalStatus: InsuranceRenewalStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  assignedStaffId: string | null;
  paymentDueAt: string | null;
  policyExpiryAt: string | null;
  renewalDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  reviewNotes: string | null;
  documentCount: number;
  documents: InsuranceDocumentResponse[];
}

export interface StaffInsuranceStatusUpdateDraft {
  inquiryId: string;
  request: UpdateInsuranceInquiryStatusRequest;
  editableFields: Array<
    | 'status'
    | 'documentStatus'
    | 'paymentStatus'
    | 'renewalStatus'
    | 'paymentDueAt'
    | 'policyExpiryAt'
    | 'renewalDueAt'
    | 'assignedStaffId'
    | 'reviewNotes'
  >;
}

export const insuranceReviewStaffRoles: StaffPortalRole[] = [
  'service_adviser',
  'super_admin',
];

export const insuranceStatusHints: Record<InsuranceInquiryStatus, string> = {
  submitted: 'New customer intake waiting for staff review.',
  needs_documents: 'The customer must add more supporting files before the inquiry can continue.',
  under_review: 'A service adviser is currently validating the inquiry and evidence.',
  for_approval: 'The case is ready for approval review.',
  approved: 'The case is approved and may move into payment or active servicing.',
  payment_pending: 'The case is waiting for payment confirmation or proof review.',
  active: 'The policy or case is actively being serviced.',
  for_renewal: 'The case requires renewal follow-up soon.',
  closed: 'The inquiry is closed and no longer accepts workflow updates.',
  rejected: 'The inquiry cannot continue in its current form.',
  cancelled: 'The inquiry was cancelled before completion.',
};

export const insuranceStatusTransitions: Record<
  InsuranceInquiryStatus,
  InsuranceInquiryStatus[]
> = {
  submitted: ['needs_documents', 'under_review', 'for_approval', 'approved', 'rejected', 'cancelled'],
  needs_documents: ['under_review', 'for_approval', 'approved', 'rejected', 'cancelled', 'closed'],
  under_review: ['needs_documents', 'for_approval', 'approved', 'rejected', 'cancelled', 'closed'],
  for_approval: ['approved', 'needs_documents', 'rejected', 'cancelled', 'closed'],
  approved: ['payment_pending', 'active', 'for_renewal', 'closed', 'cancelled'],
  payment_pending: ['active', 'for_renewal', 'closed', 'cancelled'],
  active: ['for_renewal', 'closed', 'cancelled'],
  for_renewal: ['active', 'closed', 'cancelled'],
  rejected: ['closed', 'cancelled'],
  cancelled: [],
  closed: [],
};

export const staffInsuranceQueueRoute: RouteContract = insuranceRoutes.listInsuranceInquiries;

export const staffInsuranceQueueStateRules: StaffInsuranceQueueStateRule[] = [
  {
    state: 'queue_loaded',
    surface: 'staff-admin-web',
    truth: 'staff-list-read-model',
    routeKey: 'listInsuranceInquiries',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The staff queue shows one or more live insurance inquiries waiting for review or follow-up.',
  },
  {
    state: 'queue_empty',
    surface: 'staff-admin-web',
    truth: 'staff-list-read-model',
    routeKey: 'listInsuranceInquiries',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'No insurance inquiries currently match the live staff filters.',
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
    description: 'The selected inquiry is ready for a valid workflow and follow-up update.',
  },
  {
    state: 'status_update_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The workflow update request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'status_update_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'The backend accepted the inquiry workflow update and returned the updated inquiry.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateInquiryStatus',
    allowedRoles: [],
    description: 'Only service advisers and super admins may update inquiry workflow state.',
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
    description: "The requested workflow transition is not valid for the inquiry's current backend status.",
  },
  {
    state: 'update_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-insurance-record',
    routeKey: 'updateInquiryStatus',
    allowedRoles: insuranceReviewStaffRoles,
    description: 'A non-classified API or network failure blocked the workflow update.',
  },
];

export const buildStaffInsuranceQueueItem = (
  inquiry: InsuranceInquiryResponse,
): StaffInsuranceQueueItemPresentation => ({
  id: inquiry.id,
  userId: inquiry.userId,
  vehicleId: inquiry.vehicleId,
  inquiryType: inquiry.inquiryType,
  purpose: inquiry.purpose,
  subject: inquiry.subject,
  description: inquiry.description,
  customerDisplayName: inquiry.customerDisplayName ?? 'Unknown customer',
  vehicleLabel: inquiry.vehicleLabel ?? 'Unknown vehicle',
  status: inquiry.status,
  documentStatus: inquiry.documentStatus,
  paymentStatus: inquiry.paymentStatus,
  renewalStatus: inquiry.renewalStatus,
  statusHint: insuranceStatusHints[inquiry.status],
  providerName: inquiry.providerName ?? null,
  policyNumber: inquiry.policyNumber ?? null,
  assignedStaffId: inquiry.assignedStaffId ?? null,
  paymentDueAt: inquiry.paymentDueAt ?? null,
  policyExpiryAt: inquiry.policyExpiryAt ?? null,
  renewalDueAt: inquiry.renewalDueAt ?? null,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
  notes: inquiry.notes ?? null,
  reviewNotes: inquiry.reviewNotes ?? null,
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
    documentStatus: 'under_verification',
    paymentStatus: 'not_required',
    renewalStatus: 'not_applicable',
    reviewNotes: 'Checking the submitted files before the next review action.',
  },
  editableFields: [
    'status',
    'documentStatus',
    'paymentStatus',
    'renewalStatus',
    'paymentDueAt',
    'policyExpiryAt',
    'renewalDueAt',
    'assignedStaffId',
    'reviewNotes',
  ],
};

export const staffInsuranceContractSources = {
  queue: staffInsuranceQueueRoute,
  detail: insuranceRoutes.getInquiryById,
  update: insuranceRoutes.updateInquiryStatus,
  documents: insuranceRoutes.uploadInquiryDocumentFile,
} as const;
