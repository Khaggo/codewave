import type { BackJobStatus } from './requests';
import type { BackJobResponse } from './responses';

export type StaffBackJobReviewRole = 'service_adviser' | 'super_admin';

export type StaffBackJobLoadState =
  | 'back_jobs_ready'
  | 'back_jobs_loading'
  | 'back_jobs_loaded'
  | 'back_jobs_empty'
  | 'back_jobs_forbidden_role'
  | 'back_jobs_not_found'
  | 'back_jobs_failed';

export type StaffBackJobCreateState =
  | 'create_ready'
  | 'create_submitting'
  | 'create_saved'
  | 'create_forbidden_role'
  | 'create_lineage_conflict'
  | 'create_failed';

export type StaffBackJobStatusState =
  | 'status_ready'
  | 'status_submitting'
  | 'status_saved'
  | 'status_forbidden_role'
  | 'status_invalid_transition'
  | 'status_evidence_required'
  | 'status_failed';

export type StaffBackJobReworkState =
  | 'rework_ready'
  | 'rework_submitting'
  | 'rework_saved'
  | 'rework_not_approved'
  | 'rework_already_linked'
  | 'rework_failed';

export type BackJobCustomerVisibility =
  | 'staff_only_review'
  | 'customer_safe_rework'
  | 'customer_safe_outcome';

export interface StaffBackJobRule<TState extends string> {
  state: TState;
  allowedRoles: StaffBackJobReviewRole[];
  backendRoute: string;
  notes: string;
}

export const staffBackJobReviewRoles: StaffBackJobReviewRole[] = [
  'service_adviser',
  'super_admin',
];

export const backJobStatusLabels: Record<BackJobStatus, string> = {
  reported: 'Reported',
  inspected: 'Inspected',
  approved_for_rework: 'Approved For Rework',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const backJobStatusTransitions: Record<BackJobStatus, BackJobStatus[]> = {
  reported: ['inspected', 'rejected', 'closed'],
  inspected: ['approved_for_rework', 'rejected', 'closed'],
  approved_for_rework: ['in_progress', 'rejected', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
  rejected: ['closed'],
};

export const staffBackJobCreateRules: StaffBackJobRule<StaffBackJobCreateState>[] = [
  {
    state: 'create_ready',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'POST /api/back-jobs',
    notes: 'A staff reviewer can open a back-job case against finalized original work.',
  },
  {
    state: 'create_lineage_conflict',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'POST /api/back-jobs',
    notes: 'The backend rejects mismatched customer, vehicle, booking, original job, or return-inspection lineage.',
  },
];

export const staffBackJobStatusRules: StaffBackJobRule<StaffBackJobStatusState>[] = [
  {
    state: 'status_ready',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'PATCH /api/back-jobs/:id/status',
    notes: 'Reviewers can advance only backend-supported transitions.',
  },
  {
    state: 'status_evidence_required',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'PATCH /api/back-jobs/:id/status',
    notes: 'Inspection/rework approval requires return-inspection evidence and findings.',
  },
  {
    state: 'status_invalid_transition',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'PATCH /api/back-jobs/:id/status',
    notes: 'The backend rejects unsupported lifecycle jumps.',
  },
];

export const staffBackJobReworkRules: StaffBackJobRule<StaffBackJobReworkState>[] = [
  {
    state: 'rework_ready',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'POST /api/job-orders',
    notes: 'Approved back jobs can create one linked rework job order with explicit parent lineage.',
  },
  {
    state: 'rework_not_approved',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'POST /api/job-orders',
    notes: 'Only approved_for_rework back jobs can become rework job orders.',
  },
  {
    state: 'rework_already_linked',
    allowedRoles: staffBackJobReviewRoles,
    backendRoute: 'POST /api/job-orders',
    notes: 'Duplicate rework job-order creation is blocked once a rework job order exists.',
  },
];

export const canStaffManageBackJobs = (role?: string | null): role is StaffBackJobReviewRole =>
  staffBackJobReviewRoles.includes(role as StaffBackJobReviewRole);

export const getAllowedBackJobStatusTargets = (status?: BackJobStatus | null) =>
  status ? backJobStatusTransitions[status] ?? [] : [];

export const canCreateReworkJobOrder = (backJob?: BackJobResponse | null) =>
  Boolean(backJob && backJob.status === 'approved_for_rework' && !backJob.reworkJobOrderId);

export const getBackJobCustomerVisibility = (
  status?: BackJobStatus | null,
): BackJobCustomerVisibility => {
  if (status === 'approved_for_rework' || status === 'in_progress') {
    return 'customer_safe_rework';
  }

  if (status === 'resolved' || status === 'closed' || status === 'rejected') {
    return 'customer_safe_outcome';
  }

  return 'staff_only_review';
};

export const isBackJobCustomerSafe = (status?: BackJobStatus | null) =>
  getBackJobCustomerVisibility(status) !== 'staff_only_review';

export const getBackJobValidationState = (backJob?: BackJobResponse | null) => {
  if (!backJob) {
    return 'not_loaded';
  }

  if (backJob.status === 'approved_for_rework' && !backJob.returnInspectionId) {
    return 'approval_missing_return_inspection';
  }

  if (backJob.status === 'in_progress' && !backJob.reworkJobOrderId) {
    return 'rework_missing_job_order';
  }

  if (backJob.status === 'resolved' && !backJob.resolutionNotes) {
    return 'resolution_notes_recommended';
  }

  return 'valid';
};

export const backJobReviewContractSources = [
  'docs/architecture/domains/main-service/back-jobs.md',
  'docs/architecture/domains/main-service/job-orders.md',
  'docs/architecture/tasks/05-client-integration/T519-back-jobs-review-and-rework-web-flow.md',
  'docs/contracts/T109-back-jobs-review-and-validation.md',
  'backend/apps/main-service/src/modules/back-jobs/controllers/back-jobs.controller.ts',
  'backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts',
  'frontend/src/lib/backJobsClient.js',
  'frontend/src/app/backjobs/BackJobsContent.js',
] as const;
