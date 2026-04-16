import type { RouteContract } from '../shared';

export type VehicleLifecycleSummaryStatus =
  | 'queued'
  | 'generating'
  | 'generation_failed'
  | 'pending_review'
  | 'approved'
  | 'rejected';
export type VehicleLifecycleSummaryReviewDecision = 'approved' | 'rejected';
export type VehicleTimelineEventCategory = 'administrative' | 'verified';
export type VehicleTimelineSourceType =
  | 'booking'
  | 'inspection'
  | 'job_order'
  | 'quality_gate'
  | 'lifecycle_summary'
  | 'manual';

export interface ReviewVehicleLifecycleSummaryRequest {
  decision: VehicleLifecycleSummaryReviewDecision;
  reviewNotes?: string;
}

export const vehicleLifecycleRoutes: Record<string, RouteContract> = {
  getVehicleTimeline: {
    method: 'GET',
    path: '/api/vehicles/:id/timeline',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Returns the normalized lifecycle timeline, including booking, inspection, job-order, QA, and reviewed-summary facts.',
  },
  generateVehicleLifecycleSummary: {
    method: 'POST',
    path: '/api/vehicles/:id/lifecycle-summary/generate',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Only service advisers or super admins can queue review-gated lifecycle summary generation. The returned draft may still be queued or generating when the POST call returns.',
  },
  reviewVehicleLifecycleSummary: {
    method: 'PATCH',
    path: '/api/vehicles/:id/lifecycle-summary/:summaryId/review',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Approves or rejects a generated lifecycle summary for customer visibility.',
  },
};
