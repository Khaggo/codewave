import type {
  VehicleLifecycleSummaryStatus,
  VehicleTimelineEventCategory,
  VehicleTimelineSourceType,
} from './requests';

export interface VehicleTimelineEventResponse {
  id: string;
  vehicleId: string;
  eventType: string;
  eventCategory: VehicleTimelineEventCategory;
  sourceType: VehicleTimelineSourceType;
  sourceId: string;
  occurredAt: string;
  verified: boolean;
  inspectionId?: string | null;
  actorUserId?: string | null;
  notes?: string | null;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleLifecycleSummaryProvenanceResponse {
  provider: string;
  model: string;
  promptVersion: string;
  evidenceRefs: string[];
  evidenceSummary: string;
}

export interface VehicleLifecycleSummaryResponse {
  id: string;
  vehicleId: string;
  requestedByUserId: string;
  summaryText: string;
  status: VehicleLifecycleSummaryStatus;
  customerVisible: boolean;
  reviewNotes?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  customerVisibleAt?: string | null;
  provenance: VehicleLifecycleSummaryProvenanceResponse;
  createdAt: string;
  updatedAt: string;
}
