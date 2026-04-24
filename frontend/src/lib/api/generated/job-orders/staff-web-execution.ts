import type { StaffPortalRole } from '../auth/staff-web-session';
import { jobOrdersRoutes, type JobOrderStatus } from './requests';
import type { JobOrderResponse } from './responses';

export type StaffJobOrderExecutionRole = Extract<StaffPortalRole, 'technician' | 'service_adviser' | 'super_admin'>;
export type StaffJobOrderReviewerRole = Extract<StaffPortalRole, 'service_adviser' | 'super_admin'>;

export type StaffJobOrderProgressState =
  | 'progress_ready'
  | 'progress_submitting'
  | 'progress_saved'
  | 'progress_forbidden_role'
  | 'progress_not_assigned'
  | 'progress_job_order_not_found'
  | 'progress_conflict'
  | 'progress_failed';

export type StaffJobOrderPhotoState =
  | 'photo_ready'
  | 'photo_submitting'
  | 'photo_saved'
  | 'photo_forbidden_role'
  | 'photo_job_order_not_found'
  | 'photo_conflict'
  | 'photo_failed';

export type StaffJobOrderFinalizeState =
  | 'finalize_ready'
  | 'finalize_submitting'
  | 'finalize_saved'
  | 'finalize_forbidden_role'
  | 'finalize_job_order_not_found'
  | 'finalize_blocked_by_qa'
  | 'finalize_failed';

export type StaffJobOrderInvoicePaymentState =
  | 'payment_ready'
  | 'payment_submitting'
  | 'payment_saved'
  | 'payment_forbidden_role'
  | 'payment_job_order_not_found'
  | 'payment_not_finalized'
  | 'payment_already_paid'
  | 'payment_failed';

export interface StaffJobOrderExecutionRule<TState extends string, TRouteKey extends string> {
  state: TState;
  surface: 'staff-admin-web';
  truth: 'synchronous-job-order-record' | 'client-guard' | 'qa-release-gate';
  routeKey: TRouteKey;
  allowedRoles: StaffJobOrderExecutionRole[];
  description: string;
}

export const staffJobOrderExecutionRoles: StaffJobOrderExecutionRole[] = [
  'technician',
  'service_adviser',
  'super_admin',
];

export const staffJobOrderReviewerRoles: StaffJobOrderReviewerRole[] = [
  'service_adviser',
  'super_admin',
];

export const staffJobOrderProgressRules: StaffJobOrderExecutionRule<
  StaffJobOrderProgressState,
  'addJobOrderProgress'
>[] = [
  {
    state: 'progress_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'addJobOrderProgress',
    allowedRoles: ['technician'],
    description: 'An assigned technician can append structured progress to a loaded job order.',
  },
  {
    state: 'progress_not_assigned',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'addJobOrderProgress',
    allowedRoles: ['technician'],
    description: 'The current technician is not assigned to this job order, so progress entry submission should stay blocked.',
  },
  {
    state: 'progress_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'addJobOrderProgress',
    allowedRoles: ['technician'],
    description: 'The backend accepted the progress entry and returned the updated job order.',
  },
  {
    state: 'progress_conflict',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'addJobOrderProgress',
    allowedRoles: ['technician'],
    description: 'The job order cannot accept the progress evidence in its current state.',
  },
  {
    state: 'progress_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'addJobOrderProgress',
    allowedRoles: ['technician'],
    description: 'A non-classified API or network failure blocked progress submission.',
  },
];

export const staffJobOrderPhotoRules: StaffJobOrderExecutionRule<
  StaffJobOrderPhotoState,
  'addJobOrderPhoto'
>[] = [
  {
    state: 'photo_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'addJobOrderPhoto',
    allowedRoles: staffJobOrderExecutionRoles,
    description: 'Assigned technicians, service advisers, and super admins can attach work evidence photos.',
  },
  {
    state: 'photo_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'addJobOrderPhoto',
    allowedRoles: staffJobOrderExecutionRoles,
    description: 'The backend accepted photo evidence and returned the updated job order.',
  },
  {
    state: 'photo_conflict',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'addJobOrderPhoto',
    allowedRoles: staffJobOrderExecutionRoles,
    description: 'The job order cannot accept photo evidence in its current state.',
  },
];

export const staffJobOrderFinalizeRules: StaffJobOrderExecutionRule<
  StaffJobOrderFinalizeState,
  'finalizeJobOrder'
>[] = [
  {
    state: 'finalize_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'finalizeJobOrder',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'The responsible service adviser or super admin can request invoice-ready finalization.',
  },
  {
    state: 'finalize_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'finalizeJobOrder',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'The backend generated the invoice-ready record and returned the finalized job order.',
  },
  {
    state: 'finalize_blocked_by_qa',
    surface: 'staff-admin-web',
    truth: 'qa-release-gate',
    routeKey: 'finalizeJobOrder',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'QA release or work-item completion blocks invoice-ready finalization.',
  },
];

export const staffJobOrderInvoicePaymentRules: StaffJobOrderExecutionRule<
  StaffJobOrderInvoicePaymentState,
  'recordInvoicePayment'
>[] = [
  {
    state: 'payment_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'recordInvoicePayment',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'The responsible service adviser or super admin can record payment after invoice-ready finalization.',
  },
  {
    state: 'payment_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'recordInvoicePayment',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'The backend recorded invoice settlement and returned the updated job order.',
  },
  {
    state: 'payment_not_finalized',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'recordInvoicePayment',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'Only finalized job orders with an invoice-ready record can accept payment settlement.',
  },
  {
    state: 'payment_already_paid',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'recordInvoicePayment',
    allowedRoles: staffJobOrderReviewerRoles,
    description: 'The invoice-ready record is already paid and cannot be settled again.',
  },
];

export const canStaffReadExecutionJobOrder = (role?: StaffPortalRole | null): boolean =>
  staffJobOrderExecutionRoles.includes(role as StaffJobOrderExecutionRole);

export const canStaffCreateEvidencePhoto = ({
  role,
  jobOrder,
  userId,
}: {
  role?: StaffPortalRole | null;
  jobOrder?: JobOrderResponse | null;
  userId?: string | null;
}): boolean => {
  if (staffJobOrderReviewerRoles.includes(role as StaffJobOrderReviewerRole)) {
    return true;
  }

  return Boolean(
    role === 'technician' &&
    userId &&
    jobOrder?.assignments?.some((assignment) => assignment.technicianUserId === userId),
  );
};

export const canStaffAppendProgress = ({
  role,
  jobOrder,
  userId,
}: {
  role?: StaffPortalRole | null;
  jobOrder?: JobOrderResponse | null;
  userId?: string | null;
}): boolean =>
  Boolean(
    role === 'technician' &&
    userId &&
    jobOrder?.assignments?.some((assignment) => assignment.technicianUserId === userId),
  );

export const canStaffFinalizeOrRecordPayment = ({
  role,
  jobOrder,
  userId,
}: {
  role?: StaffPortalRole | null;
  jobOrder?: JobOrderResponse | null;
  userId?: string | null;
}): boolean =>
  Boolean(
    role === 'super_admin' ||
    (role === 'service_adviser' && userId && jobOrder?.serviceAdviserUserId === userId),
  );

export const getJobOrderExecutionPhase = (jobOrder: Pick<JobOrderResponse, 'status'> | null | undefined) => {
  if (!jobOrder) {
    return 'not_loaded';
  }

  if (jobOrder.status === 'finalized') {
    return 'invoice_ready';
  }

  if ((['assigned', 'in_progress', 'blocked', 'ready_for_qa'] as JobOrderStatus[]).includes(jobOrder.status)) {
    return 'active_execution';
  }

  return jobOrder.status;
};

export const jobOrderExecutionContractSources = {
  detail: jobOrdersRoutes.getJobOrderById,
  progress: jobOrdersRoutes.addJobOrderProgress,
  photo: jobOrdersRoutes.addJobOrderPhoto,
  finalize: jobOrdersRoutes.finalizeJobOrder,
  payment: jobOrdersRoutes.recordInvoicePayment,
} as const;
