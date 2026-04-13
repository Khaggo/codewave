import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  VehicleLifecycleSummaryResponse,
  VehicleTimelineEventResponse,
} from '../../lib/api/generated/vehicle-lifecycle/responses';

export const vehicleTimelineMock: VehicleTimelineEventResponse[] = [
  {
    id: 'timeline-event-1',
    vehicleId: 'vehicle-1',
    eventType: 'booking_created',
    eventCategory: 'administrative',
    sourceType: 'booking',
    sourceId: 'booking-1',
    occurredAt: '2026-05-12T01:00:00.000Z',
    verified: false,
    inspectionId: null,
    actorUserId: 'service-adviser-1',
    notes: 'Booking created by service adviser.',
    dedupeKey: 'booking:booking-1:history:history-1',
    createdAt: '2026-05-12T01:00:00.000Z',
    updatedAt: '2026-05-12T01:00:00.000Z',
  },
  {
    id: 'timeline-event-2',
    vehicleId: 'vehicle-1',
    eventType: 'inspection_completion_completed',
    eventCategory: 'verified',
    sourceType: 'inspection',
    sourceId: 'inspection-1',
    occurredAt: '2026-05-12T03:00:00.000Z',
    verified: true,
    inspectionId: 'inspection-1',
    actorUserId: 'service-adviser-1',
    notes: 'Completion verification passed.',
    dedupeKey: 'inspection:inspection-1:completed',
    createdAt: '2026-05-12T03:00:00.000Z',
    updatedAt: '2026-05-12T03:00:00.000Z',
  },
];

export const pendingLifecycleSummaryMock: VehicleLifecycleSummaryResponse = {
  id: 'summary-1',
  vehicleId: 'vehicle-1',
  requestedByUserId: 'service-adviser-1',
  summaryText:
    '2024 Honda City has 2 recorded lifecycle events in this history snapshot. Administrative milestones include booking created (2026-05-12). Verified evidence includes Completion Completed (2026-05-12). The latest verified service record was logged on 2026-05-12.',
  status: 'pending_review',
  customerVisible: false,
  reviewNotes: null,
  reviewedByUserId: null,
  reviewedAt: null,
  customerVisibleAt: null,
  provenance: {
    provider: 'local-summary-adapter',
    model: 'timeline-summary-v1',
    promptVersion: 'vehicle-lifecycle.summary.v1',
    evidenceRefs: ['booking:booking-1:history:history-1', 'inspection:inspection-1:completed'],
    evidenceSummary:
      'Evidence is limited to normalized lifecycle timeline events, with special emphasis on verified inspection-backed milestones and customer-safe administrative statuses.',
  },
  createdAt: '2026-05-12T03:30:00.000Z',
  updatedAt: '2026-05-12T03:30:00.000Z',
};

export const approvedLifecycleSummaryMock: VehicleLifecycleSummaryResponse = {
  ...pendingLifecycleSummaryMock,
  status: 'approved',
  customerVisible: true,
  reviewNotes: 'Approved after checking the latest verified lifecycle evidence.',
  reviewedByUserId: 'service-adviser-1',
  reviewedAt: '2026-05-12T03:45:00.000Z',
  customerVisibleAt: '2026-05-12T03:45:00.000Z',
  updatedAt: '2026-05-12T03:45:00.000Z',
};

export const rejectedLifecycleSummaryMock: VehicleLifecycleSummaryResponse = {
  ...pendingLifecycleSummaryMock,
  status: 'rejected',
  customerVisible: false,
  reviewNotes: 'Rejected because the draft should be regenerated after more verified evidence is recorded.',
  reviewedByUserId: 'super-admin-1',
  reviewedAt: '2026-05-12T03:50:00.000Z',
  customerVisibleAt: null,
  updatedAt: '2026-05-12T03:50:00.000Z',
};

export const lifecycleSummaryForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can manage lifecycle summaries.',
  source: 'swagger',
};
