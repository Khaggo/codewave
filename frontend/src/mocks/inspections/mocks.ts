import type { CreateInspectionRequest } from '../../lib/api/generated/inspections/requests';
import type { InspectionFindingResponse, InspectionResponse } from '../../lib/api/generated/inspections/responses';
import {
  getInspectionVerificationState,
  getSelectedInspection,
  getStaffInspectionCaptureSuccessState,
  getStaffInspectionHistoryState,
  inspectionCaptureSubmissionTemplate,
  staffInspectionCaptureStateRules,
  staffInspectionReadStateRules,
  summarizeInspectionFindings,
} from '../../lib/api/generated/inspections/staff-web-inspections';
import { inspectionsErrorCases } from '../../lib/api/generated/inspections/errors';
import type { ApiErrorResponse } from '../../lib/api/generated/shared';

export const verifiedInspectionFindingMock: InspectionFindingResponse = {
  id: '8a72f8c7-8ac6-44b0-b4ff-fd5d39ca81d3',
  inspectionId: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  category: 'brakes',
  label: 'Brake pedal response confirmed',
  severity: 'medium',
  notes: 'Pedal response is stable after replacement and road test.',
  isVerified: true,
  createdAt: '2026-04-13T09:05:00.000Z',
  updatedAt: '2026-04-13T09:05:00.000Z',
};

export const unverifiedInspectionFindingMock: InspectionFindingResponse = {
  id: '6cd2ff23-c6bb-40f6-b966-8313d87bbf90',
  inspectionId: '2f4d30f6-5327-4c3d-95c2-f2fef6b3d401',
  category: 'body',
  label: 'Rear bumper scratch noted',
  severity: 'low',
  notes: 'Customer informed about cosmetic scratch before service start.',
  isVerified: false,
  createdAt: '2026-04-12T07:30:00.000Z',
  updatedAt: '2026-04-12T07:30:00.000Z',
};

export const verifiedCompletionInspectionMock: InspectionResponse = {
  id: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  bookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  inspectionType: 'completion',
  status: 'completed',
  inspectorUserId: '5a74bb08-9b6a-4c08-8b97-3b6a3a1b2d88',
  notes: 'Final release inspection passed.',
  attachmentRefs: ['upload://vehicle/completion-front-right'],
  findings: [verifiedInspectionFindingMock],
  createdAt: '2026-04-13T09:00:00.000Z',
  updatedAt: '2026-04-13T09:05:00.000Z',
};

export const mixedIntakeInspectionMock: InspectionResponse = {
  id: '2f4d30f6-5327-4c3d-95c2-f2fef6b3d401',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  bookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  inspectionType: 'intake',
  status: 'completed',
  inspectorUserId: 'bbf9e9d4-f3d6-47a1-a83c-3e85f85d3d5a',
  notes: 'Arrival condition documented before job-order creation.',
  attachmentRefs: ['upload://vehicle/intake-rear-bumper'],
  findings: [
    unverifiedInspectionFindingMock,
    {
      ...verifiedInspectionFindingMock,
      id: 'f1df9b8a-b0d1-43e4-a8cc-98c0c404b7ef',
      inspectionId: '2f4d30f6-5327-4c3d-95c2-f2fef6b3d401',
      category: 'fluids',
      label: 'Brake fluid level checked',
      severity: 'info',
      notes: 'Fluid level acceptable before service start.',
      isVerified: true,
      createdAt: '2026-04-12T07:33:00.000Z',
      updatedAt: '2026-04-12T07:33:00.000Z',
    },
  ],
  createdAt: '2026-04-12T07:25:00.000Z',
  updatedAt: '2026-04-12T07:33:00.000Z',
};

export const unverifiedReturnInspectionMock: InspectionResponse = {
  id: 'd5a712e7-7dba-4efa-bbfb-5f6ec18effdd',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  bookingId: null,
  inspectionType: 'return',
  status: 'needs_followup',
  inspectorUserId: '5a74bb08-9b6a-4c08-8b97-3b6a3a1b2d88',
  notes: 'Returned vehicle needs another look at the front suspension noise.',
  attachmentRefs: [],
  findings: [
    {
      id: '3448e073-cb91-4b37-a3a7-9d6172e8f4f4',
      inspectionId: 'd5a712e7-7dba-4efa-bbfb-5f6ec18effdd',
      category: 'suspension',
      label: 'Front-left rattle persists',
      severity: 'high',
      notes: 'Requires follow-up diagnosis.',
      isVerified: false,
      createdAt: '2026-04-15T11:20:00.000Z',
      updatedAt: '2026-04-15T11:20:00.000Z',
    },
  ],
  createdAt: '2026-04-15T11:15:00.000Z',
  updatedAt: '2026-04-15T11:20:00.000Z',
};

export const vehicleInspectionHistoryMock: InspectionResponse[] = [
  verifiedCompletionInspectionMock,
  mixedIntakeInspectionMock,
  unverifiedReturnInspectionMock,
];

export const emptyVehicleInspectionHistoryMock: InspectionResponse[] = [];

export const createInspectionRequestMock: CreateInspectionRequest =
  inspectionCaptureSubmissionTemplate.request;

export const staffInspectionCaptureStateRuleMocks = staffInspectionCaptureStateRules;

export const staffInspectionReadStateRuleMocks = staffInspectionReadStateRules;

export const inspectionVerificationStateMocks = {
  verified: getInspectionVerificationState(verifiedCompletionInspectionMock),
  mixed: getInspectionVerificationState(mixedIntakeInspectionMock),
  unverified: getInspectionVerificationState(unverifiedReturnInspectionMock),
} as const;

export const inspectionCaptureResolvedStateMocks = {
  verified: getStaffInspectionCaptureSuccessState(verifiedCompletionInspectionMock),
  mixed: getStaffInspectionCaptureSuccessState(mixedIntakeInspectionMock),
  unverified: getStaffInspectionCaptureSuccessState(unverifiedReturnInspectionMock),
} as const;

export const inspectionReadResolvedStateMocks = {
  loaded: getStaffInspectionHistoryState(vehicleInspectionHistoryMock),
  empty: getStaffInspectionHistoryState(emptyVehicleInspectionHistoryMock),
  selected: getSelectedInspection(vehicleInspectionHistoryMock, mixedIntakeInspectionMock.id),
} as const;

export const inspectionFindingSummaryMocks = {
  verified: summarizeInspectionFindings(verifiedCompletionInspectionMock.findings),
  mixed: summarizeInspectionFindings(mixedIntakeInspectionMock.findings),
} as const;

export const inspectionVehicleNotFoundErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Vehicle not found.',
  source: 'swagger',
};

export const inspectionBookingConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Booking does not belong to the target vehicle',
  source: 'swagger',
};

export const inspectionCompletionMissingFindingsErrorMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'Completion inspections require at least one finding',
  source: 'swagger',
};

export const inspectionForbiddenRoleErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Your role does not have access to the inspection workspace in the staff portal.',
  source: 'task',
};

export const inspectionsErrorCaseMocks = inspectionsErrorCases;
