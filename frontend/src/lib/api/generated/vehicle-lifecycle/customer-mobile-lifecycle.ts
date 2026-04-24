import { vehicleLifecycleRoutes } from './requests';
import type {
  VehicleLifecycleSummaryResponse,
  VehicleTimelineEventResponse,
} from './responses';

export type CustomerVehicleTimelineMobileState =
  | 'timeline_loading'
  | 'timeline_ready'
  | 'timeline_empty'
  | 'timeline_forbidden'
  | 'timeline_not_found'
  | 'timeline_load_failed';

export type CustomerLifecycleSummaryVisibilityState =
  | 'reviewed_summary_visible'
  | 'pending_summary_hidden'
  | 'hidden_summary';

export type CustomerTimelineFilter =
  | 'All'
  | 'Verified'
  | 'Administrative'
  | 'Summary';

export interface CustomerVehicleTimelineStateRule {
  state: CustomerVehicleTimelineMobileState;
  surface: 'customer-mobile';
  truth: 'vehicle-lifecycle-route' | 'client-guard';
  routeKey: 'getVehicleTimeline';
  description: string;
}

export interface CustomerLifecycleSummaryStateRule {
  state: CustomerLifecycleSummaryVisibilityState;
  surface: 'customer-mobile';
  truth: 'staff-reviewed-summary-record' | 'timeline-review-event' | 'client-guard';
  routeKey:
    | 'getVehicleTimeline'
    | 'generateVehicleLifecycleSummary'
    | 'reviewVehicleLifecycleSummary';
  description: string;
}

export interface CustomerTimelineEventPresentation {
  title: string;
  summary: string;
  categoryLabel: 'Verified' | 'Administrative';
  sourceLabel: string;
  filter: Exclude<CustomerTimelineFilter, 'All'>;
}

export interface CustomerLifecycleSummaryCard {
  state: CustomerLifecycleSummaryVisibilityState;
  stateLabel: 'Visible' | 'Pending' | 'Hidden';
  title: string;
  helperText: string;
  summaryText: string | null;
  reviewedAt: string | null;
  source: 'summary-response' | 'timeline-review-event' | 'hidden';
}

export const customerTimelineFilters: CustomerTimelineFilter[] = [
  'All',
  'Verified',
  'Administrative',
  'Summary',
];

export const customerVehicleTimelineStateRules: CustomerVehicleTimelineStateRule[] = [
  {
    state: 'timeline_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'getVehicleTimeline',
    description: 'The customer mobile app is loading the canonical lifecycle timeline for the selected vehicle.',
  },
  {
    state: 'timeline_ready',
    surface: 'customer-mobile',
    truth: 'vehicle-lifecycle-route',
    routeKey: 'getVehicleTimeline',
    description: 'At least one normalized lifecycle event is available for customer viewing.',
  },
  {
    state: 'timeline_empty',
    surface: 'customer-mobile',
    truth: 'vehicle-lifecycle-route',
    routeKey: 'getVehicleTimeline',
    description: 'The selected vehicle has no customer-visible lifecycle events yet.',
  },
  {
    state: 'timeline_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'getVehicleTimeline',
    description: 'The lifecycle timeline cannot load without an active customer session.',
  },
  {
    state: 'timeline_not_found',
    surface: 'customer-mobile',
    truth: 'vehicle-lifecycle-route',
    routeKey: 'getVehicleTimeline',
    description: 'The requested vehicle or lifecycle record no longer exists.',
  },
  {
    state: 'timeline_load_failed',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'getVehicleTimeline',
    description: 'A non-classified network or API failure prevented the lifecycle timeline from loading.',
  },
];

export const customerLifecycleSummaryStateRules: CustomerLifecycleSummaryStateRule[] = [
  {
    state: 'reviewed_summary_visible',
    surface: 'customer-mobile',
    truth: 'staff-reviewed-summary-record',
    routeKey: 'reviewVehicleLifecycleSummary',
    description: 'A lifecycle summary has been approved for customer visibility, either through the shared summary DTO or through a reviewed-summary timeline event.',
  },
  {
    state: 'pending_summary_hidden',
    surface: 'customer-mobile',
    truth: 'staff-reviewed-summary-record',
    routeKey: 'generateVehicleLifecycleSummary',
    description: 'A lifecycle summary draft exists but is still queued, generating, or pending review and must remain hidden from customers.',
  },
  {
    state: 'hidden_summary',
    surface: 'customer-mobile',
    truth: 'timeline-review-event',
    routeKey: 'getVehicleTimeline',
    description: 'No reviewed customer-visible summary is available yet, or the latest summary remained hidden after rejection or failure.',
  },
];

const eventTitleMap: Record<string, string> = {
  booking_created: 'Booking created',
  booking_pending: 'Booking submitted',
  booking_confirmed: 'Booking confirmed',
  booking_rescheduled: 'Booking rescheduled',
  booking_declined: 'Booking declined',
  booking_cancelled: 'Booking cancelled',
  booking_completed: 'Booking completed',
  inspection_completion_completed: 'Inspection verified',
  quality_gate_passed: 'Quality gate passed',
  quality_gate_blocked: 'Quality gate blocked',
  quality_gate_overridden: 'Quality gate override recorded',
  job_order_created: 'Job order created',
  job_order_assigned: 'Job order assigned',
  job_order_in_progress: 'Service in progress',
  job_order_completed: 'Service work completed',
  job_order_finalized: 'Invoice-ready release',
  lifecycle_summary_approved: 'Reviewed summary approved',
  lifecycle_summary_rejected: 'Reviewed summary rejected',
};

const sourceLabelMap: Record<VehicleTimelineEventResponse['sourceType'], string> = {
  booking: 'Booking',
  inspection: 'Inspection',
  job_order: 'Job Order',
  quality_gate: 'Quality Gate',
  lifecycle_summary: 'Reviewed Summary',
  manual: 'Manual Event',
};

const approvedSummaryReviewEvent = (
  event: VehicleTimelineEventResponse,
): boolean =>
  event.sourceType === 'lifecycle_summary' &&
  event.eventType === 'lifecycle_summary_approved';

const hiddenSummaryStatuses = new Set<VehicleLifecycleSummaryResponse['status']>([
  'generation_failed',
  'rejected',
]);

const pendingSummaryStatuses = new Set<VehicleLifecycleSummaryResponse['status']>([
  'queued',
  'generating',
  'pending_review',
]);

const humanizeEventType = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const getCustomerSafeLifecycleEventSummary = (
  event: VehicleTimelineEventResponse,
): string => {
  switch (event.eventType) {
    case 'booking_created':
      return 'Your booking request entered the vehicle lifecycle.';
    case 'booking_confirmed':
      return 'Staff confirmed the appointment for this vehicle.';
    case 'booking_rescheduled':
      return 'The appointment schedule changed for this vehicle.';
    case 'booking_declined':
      return 'The booking request did not proceed and stayed out of service execution.';
    case 'booking_cancelled':
      return 'The booking was cancelled before service execution continued.';
    case 'booking_completed':
      return 'The booking completed and handed off to the next lifecycle step.';
    case 'job_order_created':
      return 'A service job order was created for this vehicle.';
    case 'job_order_assigned':
      return 'The service team assigned the next workshop step for this vehicle.';
    case 'job_order_in_progress':
      return 'Service work is in progress for this vehicle.';
    case 'job_order_completed':
      return 'Service work reached a completed milestone for this vehicle.';
    case 'job_order_finalized':
      return 'Service work reached invoice-ready release status.';
    case 'quality_gate_passed':
      return 'Release checks passed for this service cycle.';
    case 'quality_gate_blocked':
      return 'Release checks found an issue that required staff review.';
    case 'quality_gate_overridden':
      return 'A staff override was recorded after release review.';
    case 'lifecycle_summary_approved':
      return 'A service adviser approved a lifecycle summary for customer visibility.';
    case 'lifecycle_summary_rejected':
      return 'A generated lifecycle summary was rejected and remains hidden.';
    default:
      return event.eventCategory === 'verified'
        ? 'An inspection-backed lifecycle milestone was recorded for this vehicle.'
        : `A ${humanizeEventType(event.eventType).toLowerCase()} event was recorded for this vehicle.`;
  }
};

export const buildCustomerTimelineEventPresentation = (
  event: VehicleTimelineEventResponse,
): CustomerTimelineEventPresentation => ({
  title: eventTitleMap[event.eventType] ?? humanizeEventType(event.eventType),
  summary: getCustomerSafeLifecycleEventSummary(event),
  categoryLabel: event.eventCategory === 'verified' ? 'Verified' : 'Administrative',
  sourceLabel: sourceLabelMap[event.sourceType],
  filter:
    event.sourceType === 'lifecycle_summary'
      ? 'Summary'
      : event.eventCategory === 'verified'
        ? 'Verified'
        : 'Administrative',
});

export const getCustomerVehicleTimelineState = (
  timelineEvents: VehicleTimelineEventResponse[],
): Extract<CustomerVehicleTimelineMobileState, 'timeline_ready' | 'timeline_empty'> =>
  timelineEvents.length ? 'timeline_ready' : 'timeline_empty';

export const getCustomerLifecycleSummaryVisibilityState = ({
  summary,
  timelineEvents,
}: {
  summary?: VehicleLifecycleSummaryResponse | null;
  timelineEvents: VehicleTimelineEventResponse[];
}): CustomerLifecycleSummaryVisibilityState => {
  if (summary) {
    if (summary.customerVisible && summary.status === 'approved') {
      return 'reviewed_summary_visible';
    }

    if (pendingSummaryStatuses.has(summary.status)) {
      return 'pending_summary_hidden';
    }

    if (hiddenSummaryStatuses.has(summary.status)) {
      return 'hidden_summary';
    }
  }

  return timelineEvents.some(approvedSummaryReviewEvent)
    ? 'reviewed_summary_visible'
    : 'hidden_summary';
};

export const buildCustomerLifecycleSummaryCard = ({
  summary,
  timelineEvents,
}: {
  summary?: VehicleLifecycleSummaryResponse | null;
  timelineEvents: VehicleTimelineEventResponse[];
}): CustomerLifecycleSummaryCard => {
  const state = getCustomerLifecycleSummaryVisibilityState({
    summary,
    timelineEvents,
  });

  if (state === 'reviewed_summary_visible' && summary?.customerVisible) {
    return {
      state,
      stateLabel: 'Visible',
      title: 'Reviewed lifecycle summary',
      helperText:
        'This summary is customer-safe because a service adviser or super admin approved it after review.',
      summaryText: summary.summaryText,
      reviewedAt: summary.customerVisibleAt ?? summary.reviewedAt ?? summary.updatedAt,
      source: 'summary-response',
    };
  }

  if (state === 'reviewed_summary_visible') {
    const reviewedEvent = timelineEvents.find(approvedSummaryReviewEvent) ?? null;

    return {
      state,
      stateLabel: 'Visible',
      title: 'Reviewed lifecycle summary available',
      helperText:
        'A reviewed summary is approved for customer visibility, but the current customer timeline route does not include the full summary text yet.',
      summaryText: null,
      reviewedAt: reviewedEvent?.occurredAt ?? null,
      source: 'timeline-review-event',
    };
  }

  if (state === 'pending_summary_hidden') {
    return {
      state,
      stateLabel: 'Pending',
      title: 'Summary still hidden',
      helperText:
        summary?.status === 'queued' || summary?.status === 'generating'
          ? 'AI summary generation is still running and stays hidden until staff review is complete.'
          : 'A summary draft exists but is still waiting for human review, so customers must not treat it as final.',
      summaryText: null,
      reviewedAt: null,
      source: 'summary-response',
    };
  }

  return {
    state,
    stateLabel: 'Hidden',
    title: 'No customer-visible summary yet',
    helperText:
      'Lifecycle summary text stays hidden until a service adviser approves it, even when lifecycle events are already available.',
    summaryText: null,
    reviewedAt: null,
    source: 'hidden',
  };
};

export const customerTimelineContractSources = {
  timeline: vehicleLifecycleRoutes.getVehicleTimeline,
  generateSummary: vehicleLifecycleRoutes.generateVehicleLifecycleSummary,
  reviewSummary: vehicleLifecycleRoutes.reviewVehicleLifecycleSummary,
} as const;
