import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type { BackJobResponse } from '../../lib/api/generated/back-jobs/responses';
import {
  canCreateReworkJobOrder,
  canStaffManageBackJobs,
  getAllowedBackJobStatusTargets,
  getBackJobCustomerVisibility,
  getBackJobValidationState,
  isBackJobCustomerSafe,
  staffBackJobCreateRules,
  staffBackJobReworkRules,
  staffBackJobStatusRules,
} from '../../lib/api/generated/back-jobs/staff-web-back-jobs';

export const backJobDetailMock: BackJobResponse = {
  id: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  customerUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  originalBookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  originalJobOrderId: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  returnInspectionId: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  reworkJobOrderId: '0bbfa364-4d50-4b8e-b307-2b2e89903340',
  complaint: 'Leak returned after the previous repair.',
  status: 'in_progress',
  reviewNotes: 'Approved for warranty rework after return inspection review.',
  resolutionNotes: null,
  createdByUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  findings: [
    {
      id: 'f6adbc0a-7d37-4f14-a2b4-ef905e8ab7ac',
      backJobId: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
      category: 'engine',
      label: 'Leak still present around the original repair area',
      severity: 'high',
      notes: 'Return inspection matched the original complaint.',
      isValidated: true,
      createdAt: '2026-04-21T10:00:00.000Z',
      updatedAt: '2026-04-21T10:00:00.000Z',
    },
  ],
  createdAt: '2026-04-21T09:45:00.000Z',
  updatedAt: '2026-04-21T10:15:00.000Z',
};

export const reportedBackJobMock: BackJobResponse = {
  ...backJobDetailMock,
  id: 'b2c0f3f0-8867-4f42-b2ed-9ff10187054d',
  returnInspectionId: null,
  reworkJobOrderId: null,
  complaint: 'Customer reports vibration returned after the completed service.',
  status: 'reported',
  reviewNotes: 'Awaiting return inspection before classification.',
  resolutionNotes: null,
  findings: [],
  createdAt: '2026-04-22T08:00:00.000Z',
  updatedAt: '2026-04-22T08:00:00.000Z',
};

export const inspectedBackJobMock: BackJobResponse = {
  ...backJobDetailMock,
  id: '5642935d-f9ad-42d3-8ef9-151092973abe',
  reworkJobOrderId: null,
  status: 'inspected',
  reviewNotes: 'Return inspection found evidence that may match the original repair.',
  resolutionNotes: null,
};

export const approvedBackJobMock: BackJobResponse = {
  ...backJobDetailMock,
  id: '6a4ed3ad-6a8e-4f96-b859-088d6d6df1e5',
  reworkJobOrderId: null,
  status: 'approved_for_rework',
  reviewNotes: 'Approved for warranty rework after return inspection review.',
  resolutionNotes: null,
};

export const resolvedBackJobMock: BackJobResponse = {
  ...backJobDetailMock,
  id: '2b77174c-0f69-4c34-a6b3-271376ec5859',
  status: 'resolved',
  resolutionNotes: 'Rework completed, leak retested, and customer pickup approved.',
};

export const rejectedBackJobMock: BackJobResponse = {
  ...backJobDetailMock,
  id: 'd44f8bc5-9200-43d7-a2ef-9a12aeae196d',
  returnInspectionId: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  reworkJobOrderId: null,
  status: 'rejected',
  reviewNotes: 'Return inspection shows a new unrelated issue, not a warranty rework case.',
  resolutionNotes: 'Customer advised to open a new booking for the unrelated concern.',
};

export const backJobLineageConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Original job-order lineage does not match the submitted customer or vehicle.',
  source: 'swagger',
};

export const backJobReviewRuleMocks = {
  create: staffBackJobCreateRules,
  status: staffBackJobStatusRules,
  rework: staffBackJobReworkRules,
};

export const staffBackJobResolvedStateMocks = {
  reportedTargets: getAllowedBackJobStatusTargets('reported'),
  inspectedTargets: getAllowedBackJobStatusTargets('inspected'),
  approvedTargets: getAllowedBackJobStatusTargets('approved_for_rework'),
  reportedVisibility: getBackJobCustomerVisibility(reportedBackJobMock.status),
  approvedVisibility: getBackJobCustomerVisibility(approvedBackJobMock.status),
  resolvedVisibility: getBackJobCustomerVisibility(resolvedBackJobMock.status),
  reportedCustomerSafe: isBackJobCustomerSafe(reportedBackJobMock.status),
  approvedCustomerSafe: isBackJobCustomerSafe(approvedBackJobMock.status),
  serviceAdviserCanReview: canStaffManageBackJobs('service_adviser'),
  technicianCanReview: canStaffManageBackJobs('technician'),
  approvedCanCreateRework: canCreateReworkJobOrder(approvedBackJobMock),
  inProgressCanCreateRework: canCreateReworkJobOrder(backJobDetailMock),
  approvalValidationState: getBackJobValidationState(approvedBackJobMock),
};
