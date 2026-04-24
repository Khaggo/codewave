import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import { bookingConfirmedArrivalMock, bookingPendingFollowUpMock } from '../bookings/mocks';
import type { JobOrderResponse } from '../../lib/api/generated/job-orders/responses';
import {
  buildBookingJobOrderHandoffCandidate,
  buildJobOrderCreateDraftFromCandidate,
  getAllowedJobOrderStatusTargets,
  getJobOrderWorkbenchHandoffState,
  getSelectedJobOrderHandoffCandidate,
  staffJobOrderCreateRules,
  staffJobOrderHandoffRules,
  staffJobOrderReadRules,
  staffJobOrderStatusUpdateRules,
} from '../../lib/api/generated/job-orders/staff-web-workbench';
import {
  canStaffAppendProgress,
  canStaffCreateEvidencePhoto,
  canStaffFinalizeOrRecordPayment,
  getJobOrderExecutionPhase,
  staffJobOrderFinalizeRules,
  staffJobOrderInvoicePaymentRules,
  staffJobOrderPhotoRules,
  staffJobOrderProgressRules,
} from '../../lib/api/generated/job-orders/staff-web-execution';

export const jobOrderDetailMock: JobOrderResponse = {
  id: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
  sourceType: 'booking',
  sourceId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  jobType: 'normal',
  parentJobOrderId: null,
  customerUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  serviceAdviserUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  serviceAdviserCode: 'SA-2026-001',
  status: 'assigned',
  notes: 'Customer requested full front brake inspection.',
  createdAt: '2026-04-21T08:00:00.000Z',
  updatedAt: '2026-04-21T08:10:00.000Z',
  items: [
    {
      id: 'b20f7a04-9f8f-4477-8db7-e67059393dc1',
      jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
      name: 'Inspect front brake pads',
      description: 'Check brake-pad wear and rotor condition.',
      estimatedHours: 1,
      isCompleted: false,
    },
  ],
  assignments: [
    {
      id: 'a81274b9-1093-4bfb-a4ec-c9d35d0c19c2',
      jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
      technicianUserId: '5851db06-513f-4dc4-a6e7-a6502698843b',
      assignedAt: '2026-04-21T08:05:00.000Z',
    },
  ],
  progressEntries: [
    {
      id: '5f0397b7-5b08-49ef-a7b0-f90e5c6650fe',
      jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
      technicianUserId: '5851db06-513f-4dc4-a6e7-a6502698843b',
      entryType: 'work_started',
      message: 'Initial brake inspection started.',
      createdAt: '2026-04-21T08:12:00.000Z',
    },
  ],
  photos: [
    {
      id: 'c0ef44f0-4163-475c-a97f-75e4ef815d09',
      jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
      takenByUserId: '5851db06-513f-4dc4-a6e7-a6502698843b',
      fileName: 'front-brake-before.jpg',
      fileUrl: '/mock/job-orders/front-brake-before.jpg',
      caption: 'Initial brake condition',
      createdAt: '2026-04-21T08:13:00.000Z',
    },
  ],
};

export const jobOrderCoreConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'A job order already exists for this booking.',
  source: 'swagger',
};

export const finalizedJobOrderDetailMock: JobOrderResponse = {
  ...jobOrderDetailMock,
  status: 'finalized',
  updatedAt: '2026-04-21T09:30:00.000Z',
  invoiceRecord: {
    id: '44934b97-b1d0-4f85-8666-a2df86f2613b',
    jobOrderId: '9d6e8b65-3935-4f19-a198-5d79ca51bb76',
    invoiceReference: 'INV-JO-20260421-9D6E8B65',
    sourceType: 'booking',
    sourceId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
    customerUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
    serviceAdviserUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
    serviceAdviserCode: 'SA-2026-001',
    finalizedByUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
    paymentStatus: 'pending_payment',
    amountPaidCents: null,
    paymentMethod: null,
    paymentReference: null,
    recordedByUserId: null,
    paidAt: null,
    summary: 'All planned work completed and ready for invoice generation.',
    createdAt: '2026-04-21T09:30:00.000Z',
    updatedAt: '2026-04-21T09:30:00.000Z',
  },
};

export const paidFinalizedJobOrderDetailMock: JobOrderResponse = {
  ...finalizedJobOrderDetailMock,
  invoiceRecord: finalizedJobOrderDetailMock.invoiceRecord
    ? {
        ...finalizedJobOrderDetailMock.invoiceRecord,
        paymentStatus: 'paid',
        amountPaidCents: 159900,
        paymentMethod: 'cash',
        paymentReference: 'OR-2026-0001',
        recordedByUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
        paidAt: '2026-04-21T10:15:00.000Z',
        updatedAt: '2026-04-21T10:15:00.000Z',
      }
    : null,
  updatedAt: '2026-04-21T10:15:00.000Z',
};

export const jobOrderFinalizeConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Quality gate is blocked and must be resolved before invoice generation',
  source: 'swagger',
};

export const jobOrderWorkbenchHandoffCandidatesMock = [
  buildBookingJobOrderHandoffCandidate(bookingConfirmedArrivalMock),
];

export const jobOrderWorkbenchSelectedHandoffMock = getSelectedJobOrderHandoffCandidate(
  jobOrderWorkbenchHandoffCandidatesMock,
  bookingConfirmedArrivalMock.id,
);

export const jobOrderWorkbenchBlockedBookingMock = {
  id: bookingPendingFollowUpMock.id,
  status: bookingPendingFollowUpMock.status,
  reason: 'Only confirmed bookings can move into live job-order creation.',
};

export const jobOrderWorkbenchCreateDraftMock = jobOrderWorkbenchSelectedHandoffMock
  ? buildJobOrderCreateDraftFromCandidate(jobOrderWorkbenchSelectedHandoffMock, {
      userId: jobOrderDetailMock.serviceAdviserUserId,
      staffCode: jobOrderDetailMock.serviceAdviserCode,
    })
  : null;

export const activeJobOrderDetailMock: JobOrderResponse = {
  ...jobOrderDetailMock,
  status: 'in_progress',
  updatedAt: '2026-04-21T08:45:00.000Z',
  items: jobOrderDetailMock.items.map((item) => ({
    ...item,
    isCompleted: item.id === jobOrderDetailMock.items[0]?.id,
  })),
};

export const blockedJobOrderDetailMock: JobOrderResponse = {
  ...jobOrderDetailMock,
  status: 'blocked',
  updatedAt: '2026-04-21T09:05:00.000Z',
  notes: 'Blocked while waiting for an additional brake-hose approval from the customer.',
};

export const staffJobOrderHandoffRuleMocks = staffJobOrderHandoffRules;
export const staffJobOrderCreateRuleMocks = staffJobOrderCreateRules;
export const staffJobOrderReadRuleMocks = staffJobOrderReadRules;
export const staffJobOrderStatusUpdateRuleMocks = staffJobOrderStatusUpdateRules;
export const staffJobOrderProgressRuleMocks = staffJobOrderProgressRules;
export const staffJobOrderPhotoRuleMocks = staffJobOrderPhotoRules;
export const staffJobOrderFinalizeRuleMocks = staffJobOrderFinalizeRules;
export const staffJobOrderInvoicePaymentRuleMocks = staffJobOrderInvoicePaymentRules;

export const staffJobOrderResolvedStateMocks = {
  handoffLoaded: getJobOrderWorkbenchHandoffState(jobOrderWorkbenchHandoffCandidatesMock),
  handoffEmpty: getJobOrderWorkbenchHandoffState([]),
  nextFromDraft: getAllowedJobOrderStatusTargets('draft'),
  nextFromAssigned: getAllowedJobOrderStatusTargets('assigned'),
  nextFromInProgress: getAllowedJobOrderStatusTargets('in_progress'),
  activeExecutionPhase: getJobOrderExecutionPhase(activeJobOrderDetailMock),
  finalizedExecutionPhase: getJobOrderExecutionPhase(finalizedJobOrderDetailMock),
  technicianCanAppendProgress: canStaffAppendProgress({
    role: 'technician',
    jobOrder: activeJobOrderDetailMock,
    userId: activeJobOrderDetailMock.assignments[0]?.technicianUserId,
  }),
  adviserCanAttachPhoto: canStaffCreateEvidencePhoto({
    role: 'service_adviser',
    jobOrder: activeJobOrderDetailMock,
    userId: activeJobOrderDetailMock.serviceAdviserUserId,
  }),
  adviserCanFinalize: canStaffFinalizeOrRecordPayment({
    role: 'service_adviser',
    jobOrder: activeJobOrderDetailMock,
    userId: activeJobOrderDetailMock.serviceAdviserUserId,
  }),
} as const;

export const jobOrderWorkbenchDuplicateBlockedErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'A job order already exists for this booking.',
  source: 'swagger',
};

export const jobOrderWorkbenchSourceNotEligibleErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Job orders can only be created from confirmed bookings.',
  source: 'task',
};

export const jobOrderWorkbenchForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can create job orders.',
  source: 'swagger',
};
