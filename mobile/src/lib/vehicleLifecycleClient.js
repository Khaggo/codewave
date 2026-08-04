import { formatDate } from '../utils/validation';
import {
  createEmptyCustomerVehicleLifecycleSnapshot,
  customerTimelineFilters,
} from './customerVehicleLifecycleState.mjs';
import {
  buildAuthHeaders as transportBuildAuthHeaders,
  request as transportRequest,
} from './vehicleLifecycleTransport';

export { createEmptyCustomerVehicleLifecycleSnapshot } from './customerVehicleLifecycleState.mjs';

const buildAuthHeaders = transportBuildAuthHeaders;

const request = transportRequest;

const eventTitleMap = {
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

const sourceLabelMap = {
  booking: 'Booking',
  inspection: 'Inspection',
  job_order: 'Job Order',
  quality_gate: 'Quality Gate',
  lifecycle_summary: 'Reviewed Summary',
  insurance: 'Insurance',
  manual: 'Manual Event',
};

const approvedSummaryStatuses = new Set(['approved']);
const hiddenSummaryStatuses = new Set(['generation_failed', 'rejected']);
const pendingSummaryStatuses = new Set(['queued', 'generating', 'pending_review']);

const humanizeEventType = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const toDisplayDate = (value) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return formatDate(parsedDate);
};

const sortTimelineEventsDescending = (left, right) => {
  const timestampDifference =
    new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();

  if (timestampDifference !== 0) {
    return timestampDifference;
  }

  return String(left.dedupeKey ?? '').localeCompare(String(right.dedupeKey ?? ''));
};

const approvedSummaryReviewEvent = (event) =>
  event?.sourceType === 'lifecycle_summary' &&
  event?.eventType === 'lifecycle_summary_approved';

const getCustomerSafeLifecycleEventSummary = (event) => {
  switch (event?.eventType) {
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
      return event?.eventCategory === 'verified'
        ? 'An inspection-backed lifecycle milestone was recorded for this vehicle.'
        : `A ${humanizeEventType(event?.eventType).toLowerCase()} event was recorded for this vehicle.`;
  }
};

const getTimelineEventIcon = (event) => {
  switch (event?.sourceType) {
    case 'booking':
      return 'calendar-check-outline';
    case 'inspection':
      return event?.eventCategory === 'verified'
        ? 'shield-check-outline'
        : 'clipboard-text-outline';
    case 'job_order':
      return 'wrench-outline';
    case 'quality_gate':
      return event?.eventType === 'quality_gate_passed'
        ? 'check-decagram-outline'
        : 'alert-decagram-outline';
    case 'lifecycle_summary':
      return 'text-box-check-outline';
    default:
      return 'timeline-clock-outline';
  }
};

export const buildCustomerTimelineEventPresentation = (event) => {
  const filter =
    event.sourceType === 'lifecycle_summary'
      ? 'Summary'
      : sourceLabelMap[event.sourceType] ?? 'Lifecycle Event';
  const verified = event.verified ?? event.eventCategory === 'verified';

  return {
    id: [
      event.eventType,
      event.sourceType,
      event.occurredAt,
      event.title,
    ]
      .filter(Boolean)
      .join(':'),
    sourceType: event.sourceType ?? null,
    occurredAt: event.occurredAt,
    dateLabel: toDisplayDate(event.occurredAt),
    title: event.title ?? eventTitleMap[event.eventType] ?? humanizeEventType(event.eventType),
    summary: event.summary ?? getCustomerSafeLifecycleEventSummary(event),
    statusLabel: verified ? 'Verified' : 'Update',
    statusTone: verified ? 'verified' : 'administrative',
    typeLabel: sourceLabelMap[event.sourceType] ?? 'Lifecycle Event',
    typeTone:
      event.sourceType === 'lifecycle_summary'
        ? 'summary'
        : verified
          ? 'verified'
          : 'administrative',
    icon: getTimelineEventIcon(event),
    sourceLabel: sourceLabelMap[event.sourceType] ?? 'Lifecycle Event',
    metaLabel:
      event.sourceType === 'lifecycle_summary'
        ? 'Reviewed summary decision'
        : sourceLabelMap[event.sourceType] ?? 'Vehicle update',
    filter,
  };
};

export const getCustomerVehicleTimelineState = (timelineEvents) =>
  Array.isArray(timelineEvents) && timelineEvents.length
    ? 'timeline_ready'
    : 'timeline_empty';

export const getCustomerLifecycleSummaryVisibilityState = ({
  summary,
  timelineEvents = [],
}) => {
  if (summary) {
    if (summary.customerVisible && approvedSummaryStatuses.has(summary.status)) {
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
  timelineEvents = [],
}) => {
  const state = getCustomerLifecycleSummaryVisibilityState({
    summary,
    timelineEvents,
  });

  if (state === 'reviewed_summary_visible' && summary?.customerVisible) {
    return {
      state,
      stateLabel: 'Visible',
      title: 'Service summary',
      helperText: 'Reviewed and approved by the service team.',
      summaryText: summary.summaryText,
      reviewedAt:
        summary.customerVisibleAt ?? summary.reviewedAt ?? summary.updatedAt ?? null,
      source: 'summary-response',
    };
  }

  if (state === 'reviewed_summary_visible') {
    const reviewedEvent =
      timelineEvents.find(approvedSummaryReviewEvent) ?? null;

    return {
      state,
      stateLabel: 'Visible',
      title: 'Service summary available',
      helperText: 'Reviewed and approved by the service team.',
      summaryText: null,
      reviewedAt: reviewedEvent?.occurredAt ?? null,
      source: 'timeline-review-event',
    };
  }

  if (state === 'pending_summary_hidden') {
    return {
      state,
      stateLabel: 'Pending',
      title: 'Summary under review',
      helperText: 'The service team is reviewing this summary.',
      summaryText: null,
      reviewedAt: null,
      source: 'summary-response',
    };
  }

  return {
    state,
    stateLabel: 'Hidden',
    title: 'No approved summary yet',
    helperText: 'An approved service summary will appear here when available.',
    summaryText: null,
    reviewedAt: null,
    source: 'hidden',
  };
};

export const listVehicleTimeline = async ({ vehicleId, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError(
      'Select an owned vehicle before loading its lifecycle history.',
      400,
      {
        path: '/api/vehicles/:id/timeline',
      },
    );
  }

  const response = await request(`/api/vehicles/${vehicleId}/timeline`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return Array.isArray(response) ? response : [];
};

export const listCustomerVehicleTimelinePage = async ({
  vehicleId,
  cursor,
  limit = 20,
  sourceType,
  accessToken,
}) => {
  if (!vehicleId) {
    throw new ApiError(
      'Select an owned vehicle before loading its lifecycle history.',
      400,
      {
        path: '/api/vehicles/:id/customer-timeline',
      },
    );
  }

  const query = [
    cursor ? `cursor=${encodeURIComponent(cursor)}` : '',
    sourceType ? `sourceType=${encodeURIComponent(sourceType)}` : '',
    `limit=${Math.min(50, Math.max(1, Number(limit) || 20))}`,
  ]
    .filter(Boolean)
    .join('&');
  const response = await request(
    `/api/vehicles/${vehicleId}/customer-timeline?${query}`,
    {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    },
  );

  return {
    items: Array.isArray(response?.items) ? response.items : [],
    page: {
      limit: Number(response?.page?.limit) || limit,
      hasNext: Boolean(response?.page?.hasNext),
      nextCursor: response?.page?.nextCursor ?? null,
    },
  };
};

export const getCustomerGarageSummary = async ({ vehicleId, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select an owned vehicle before loading its Garage summary.', 400, {
      path: '/api/vehicles/:id/garage-summary',
    });
  }

  const response = await request(`/api/vehicles/${vehicleId}/garage-summary`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return response && typeof response === 'object' ? response : null;
};

export const getLatestCustomerVisibleLifecycleSummary = async ({
  vehicleId,
  accessToken,
}) => {
  if (!vehicleId) {
    throw new ApiError(
      'Select an owned vehicle before loading its lifecycle summary.',
      400,
      {
        path: '/api/vehicles/:id/lifecycle-summary/latest',
      },
    );
  }

  const response = await request(`/api/vehicles/${vehicleId}/lifecycle-summary/latest`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });

  return response && typeof response === 'object' ? response : null;
};

export const buildCustomerVehicleLifecycleSnapshot = ({
  timelineEvents = [],
  summary = null,
  page = null,
}) => {
  const orderedTimelineEvents = [...timelineEvents]
    .sort(sortTimelineEventsDescending)
    .map(buildCustomerTimelineEventPresentation);

  const verifiedEvents = orderedTimelineEvents.filter(
    (event) => event.statusTone === 'verified',
  ).length;

  return {
    timelineState: getCustomerVehicleTimelineState(orderedTimelineEvents),
    events: orderedTimelineEvents,
    stats: {
      totalEvents: orderedTimelineEvents.length,
      verifiedEvents,
      administrativeEvents: orderedTimelineEvents.length - verifiedEvents,
    },
    filters: customerTimelineFilters,
    page: page ?? {
      limit: 20,
      hasNext: false,
      nextCursor: null,
    },
    summaryCard: buildCustomerLifecycleSummaryCard({
      summary,
      timelineEvents,
    }),
  };
};

export const loadCustomerVehicleLifecycleSnapshot = async ({
  vehicleId,
  accessToken,
  summary = null,
  sourceType = null,
}) => {
  const [timelinePage, latestSummary] = await Promise.all([
    listCustomerVehicleTimelinePage({
      vehicleId,
      sourceType,
      limit: 20,
      accessToken,
    }),
    summary === null
      ? getLatestCustomerVisibleLifecycleSummary({
          vehicleId,
          accessToken,
        }).catch(() => null)
      : Promise.resolve(summary),
  ]);

  return buildCustomerVehicleLifecycleSnapshot({
    timelineEvents: timelinePage.items,
    summary: latestSummary,
    page: timelinePage.page,
  });
};
