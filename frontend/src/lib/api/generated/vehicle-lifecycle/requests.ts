import type { RouteContract } from '../shared';

export type VehicleLifecycleSummaryStatus = 'pending_review' | 'approved' | 'rejected';
export type VehicleLifecycleSummaryReviewDecision = 'approved' | 'rejected';
export type VehicleTimelineEventCategory = 'administrative' | 'verified';
export type VehicleTimelineSourceType = 'booking' | 'inspection' | 'manual';

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
    notes: 'Live route. Returns the normalized lifecycle timeline for the target vehicle.',
  },
  generateVehicleLifecycleSummary: {
    method: 'POST',
    path: '/api/vehicles/:id/lifecycle-summary/generate',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Only service advisers or super admins can generate review-gated lifecycle summaries.',
  },
  reviewVehicleLifecycleSummary: {
    method: 'PATCH',
    path: '/api/vehicles/:id/lifecycle-summary/:summaryId/review',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Approves or rejects a generated lifecycle summary for customer visibility.',
  },
};
