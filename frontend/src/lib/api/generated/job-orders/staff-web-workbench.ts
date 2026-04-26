import type { StaffPortalRole } from '../auth/staff-web-session';
import { bookingsRoutes, type BookingStatus } from '../bookings/requests';
import type { BookingResponse } from '../bookings/responses';
import { jobOrdersRoutes, type CreateJobOrderItemRequest, type CreateJobOrderRequest, type JobOrderStatus } from './requests';
import type { JobOrderResponse } from './responses';

export type StaffJobOrderWorkbenchRole = Extract<StaffPortalRole, 'service_adviser' | 'super_admin'>;

export type StaffJobOrderHandoffState =
  | 'handoff_loaded'
  | 'handoff_empty'
  | 'handoff_forbidden_role'
  | 'handoff_load_failed';

export type StaffJobOrderCreateState =
  | 'create_ready'
  | 'create_submitting'
  | 'create_saved'
  | 'duplicate_blocked'
  | 'source_not_eligible'
  | 'forbidden_role'
  | 'create_failed';

export type StaffJobOrderReadState =
  | 'detail_loaded'
  | 'forbidden_role'
  | 'job_order_not_found'
  | 'load_failed';

export type StaffJobOrderStatusUpdateState =
  | 'status_update_ready'
  | 'status_update_submitting'
  | 'status_update_saved'
  | 'forbidden_role'
  | 'job_order_not_found'
  | 'invalid_transition'
  | 'update_failed';

export interface StaffJobOrderWorkbenchHandoffRule {
  state: StaffJobOrderHandoffState;
  surface: 'staff-admin-web';
  truth: 'derived-booking-read-model' | 'client-guard';
  routeKey: 'getDailySchedule';
  allowedRoles: StaffJobOrderWorkbenchRole[];
  description: string;
}

export interface StaffJobOrderCreateRule {
  state: StaffJobOrderCreateState;
  surface: 'staff-admin-web';
  truth: 'synchronous-job-order-record' | 'client-guard';
  routeKey: 'createJobOrder';
  allowedRoles: StaffJobOrderWorkbenchRole[];
  description: string;
}

export interface StaffJobOrderReadRule {
  state: StaffJobOrderReadState;
  surface: 'staff-admin-web';
  truth: 'synchronous-job-order-record' | 'client-guard';
  routeKey: 'getJobOrderById';
  allowedRoles: Array<StaffPortalRole>;
  description: string;
}

export interface StaffJobOrderStatusUpdateRule {
  state: StaffJobOrderStatusUpdateState;
  surface: 'staff-admin-web';
  truth: 'synchronous-job-order-record' | 'client-guard';
  routeKey: 'updateJobOrderStatus';
  allowedRoles: Array<StaffPortalRole>;
  description: string;
}

export interface StaffJobOrderHandoffCandidate {
  bookingId: string;
  customerUserId: string;
  vehicleId: string;
  scheduledDate: string;
  timeSlotId: string | null;
  timeSlotLabel: string;
  bookingStatus: Extract<BookingStatus, 'confirmed'>;
  customerLabel: string;
  vehicleLabel: string;
  serviceSummary: string;
  sourceNotes: string | null;
  defaultItems: CreateJobOrderItemRequest[];
}

export interface StaffJobOrderCreateDraft {
  sourceType: 'booking';
  sourceId: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  notes?: string;
  items: CreateJobOrderItemRequest[];
  assignedTechnicianIds?: string[];
}

export const staffJobOrderWorkbenchRoles: StaffJobOrderWorkbenchRole[] = [
  'service_adviser',
  'super_admin',
];

export const jobOrderStatusTransitions: Record<JobOrderStatus, JobOrderStatus[]> = {
  draft: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'ready_for_qa', 'cancelled'],
  ready_for_qa: ['in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  finalized: [],
  cancelled: [],
};

export const staffJobOrderHandoffRules: StaffJobOrderWorkbenchHandoffRule[] = [
  {
    state: 'handoff_loaded',
    surface: 'staff-admin-web',
    truth: 'derived-booking-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'Confirmed bookings are available to hand off into job-order creation without mutating booking truth.',
  },
  {
    state: 'handoff_empty',
    surface: 'staff-admin-web',
    truth: 'derived-booking-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'No confirmed bookings are available for job-order handoff in the selected schedule view.',
  },
  {
    state: 'handoff_forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'getDailySchedule',
    allowedRoles: [],
    description: 'Only service advisers and super admins may open the job-order workbench in the current web portal.',
  },
  {
    state: 'handoff_load_failed',
    surface: 'staff-admin-web',
    truth: 'derived-booking-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'A non-classified API or network failure blocked booking handoff loading.',
  },
];

export const staffJobOrderCreateRules: StaffJobOrderCreateRule[] = [
  {
    state: 'create_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'A confirmed booking handoff is selected and the draft is ready for job-order creation.',
  },
  {
    state: 'create_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'The create job-order request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'create_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'The backend accepted the booking handoff and returned the new job order.',
  },
  {
    state: 'duplicate_blocked',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'The selected booking already owns a job order and duplicate creation is blocked.',
  },
  {
    state: 'source_not_eligible',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'The selected source is stale or no longer eligible for job-order creation.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createJobOrder',
    allowedRoles: [],
    description: 'Only service advisers and super admins may create job orders from booking handoff.',
  },
  {
    state: 'create_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'createJobOrder',
    allowedRoles: staffJobOrderWorkbenchRoles,
    description: 'A non-classified API or network failure blocked job-order creation.',
  },
];

export const staffJobOrderReadRules: StaffJobOrderReadRule[] = [
  {
    state: 'detail_loaded',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'getJobOrderById',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'A job order was loaded for detail review from the live backend route.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'getJobOrderById',
    allowedRoles: [],
    description: 'The current web portal role cannot open the selected job order.',
  },
  {
    state: 'job_order_not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'getJobOrderById',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'The requested job order could not be found.',
  },
  {
    state: 'load_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'getJobOrderById',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'A non-classified API or network failure blocked job-order detail loading.',
  },
];

export const staffJobOrderStatusUpdateRules: StaffJobOrderStatusUpdateRule[] = [
  {
    state: 'status_update_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'A loaded job order is ready for a valid status transition.',
  },
  {
    state: 'status_update_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'The job-order status update is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'status_update_saved',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'The backend accepted the job-order status transition and returned the updated record.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: [],
    description: 'The current role cannot perform the selected job-order transition.',
  },
  {
    state: 'job_order_not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'The selected job order no longer exists.',
  },
  {
    state: 'invalid_transition',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'The requested job-order status transition is not allowed.',
  },
  {
    state: 'update_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routeKey: 'updateJobOrderStatus',
    allowedRoles: ['technician', 'service_adviser', 'super_admin'],
    description: 'A non-classified API or network failure blocked the job-order status update.',
  },
];

const buildServiceSummary = (booking: BookingResponse) => {
  const serviceNames = (booking.requestedServices ?? [])
    .map((requestedService) => requestedService.service?.name)
    .filter(Boolean);

  return serviceNames.length > 0 ? serviceNames.join(', ') : 'No requested services attached';
};

const buildDefaultItems = (booking: BookingResponse): CreateJobOrderItemRequest[] => {
  const serviceItems = (booking.requestedServices ?? [])
    .map((requestedService) => requestedService.service)
    .filter(Boolean)
    .map((service) => ({
      name: service.name,
      description: service.description ?? undefined,
      estimatedHours:
        typeof service.durationMinutes === 'number' && service.durationMinutes > 0
          ? Math.max(1, Math.ceil(service.durationMinutes / 60))
          : undefined,
    }));

  return serviceItems.length > 0
    ? serviceItems
    : [
        {
          name: 'General service work item',
          description: 'Add a specific workshop task before creating the job order.',
        },
      ];
};

export const buildBookingJobOrderHandoffCandidate = (
  booking: BookingResponse & {
    customerLabel?: string | null;
    vehicleLabel?: string | null;
  },
): StaffJobOrderHandoffCandidate => ({
  bookingId: booking.id,
  customerUserId: booking.userId,
  vehicleId: booking.vehicleId,
  scheduledDate: booking.scheduledDate,
  timeSlotId: booking.timeSlotId ?? null,
  timeSlotLabel: booking.timeSlot?.label ?? 'Unscheduled slot',
  bookingStatus: 'confirmed',
  customerLabel:
    booking.customerLabel ??
    booking.userId ??
    'Unknown customer',
  vehicleLabel:
    booking.vehicleLabel ??
    booking.vehicleId ??
    'Unknown vehicle',
  serviceSummary: buildServiceSummary(booking),
  sourceNotes: booking.notes ?? null,
  defaultItems: buildDefaultItems(booking),
});

export const getJobOrderWorkbenchHandoffState = (
  candidates: StaffJobOrderHandoffCandidate[],
): Extract<StaffJobOrderHandoffState, 'handoff_loaded' | 'handoff_empty'> =>
  candidates.length > 0 ? 'handoff_loaded' : 'handoff_empty';

export const getSelectedJobOrderHandoffCandidate = (
  candidates: StaffJobOrderHandoffCandidate[],
  bookingId?: string | null,
): StaffJobOrderHandoffCandidate | null => {
  if (bookingId) {
    const selectedCandidate = candidates.find((candidate) => candidate.bookingId === bookingId);
    if (selectedCandidate) {
      return selectedCandidate;
    }
  }

  return candidates[0] ?? null;
};

export const getAllowedJobOrderStatusTargets = (status: JobOrderStatus): JobOrderStatus[] =>
  jobOrderStatusTransitions[status] ?? [];

export const buildJobOrderCreateDraftFromCandidate = (
  candidate: StaffJobOrderHandoffCandidate,
  sessionUser: { userId: string; staffCode: string },
): CreateJobOrderRequest => ({
  sourceType: 'booking',
  sourceId: candidate.bookingId,
  customerUserId: candidate.customerUserId,
  vehicleId: candidate.vehicleId,
  serviceAdviserUserId: sessionUser.userId,
  serviceAdviserCode: sessionUser.staffCode,
  notes: candidate.sourceNotes ?? undefined,
  items: candidate.defaultItems,
  assignedTechnicianIds: undefined,
});

export const jobOrderWorkbenchContractSources = {
  handoff: bookingsRoutes.getDailySchedule,
  create: jobOrdersRoutes.createJobOrder,
  detail: jobOrdersRoutes.getJobOrderById,
  updateStatus: jobOrdersRoutes.updateJobOrderStatus,
} as const;

export const getJobOrderReadStateFromResponse = (
  jobOrder: JobOrderResponse | null | undefined,
): Extract<StaffJobOrderReadState, 'detail_loaded'> | Extract<StaffJobOrderReadState, 'load_failed'> =>
  jobOrder ? 'detail_loaded' : 'load_failed';
