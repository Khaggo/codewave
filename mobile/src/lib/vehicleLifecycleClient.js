import { ApiError, getApiBaseUrl } from './authClient';
import { formatDate } from '../utils/validation';

const API_BASE_URL = getApiBaseUrl();
const VEHICLE_LIFECYCLE_REQUEST_TIMEOUT_MS = 8000;

const customerTimelineFilters = ['All', 'Verified', 'Administrative', 'Summary'];

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = VEHICLE_LIFECYCLE_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

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

const buildCustomerTimelineEventPresentation = (event) => {
  const filter =
    event.sourceType === 'lifecycle_summary'
      ? 'Summary'
      : event.eventCategory === 'verified'
        ? 'Verified'
        : 'Administrative';

  return {
    id: event.id,
    occurredAt: event.occurredAt,
    dateLabel: toDisplayDate(event.occurredAt),
    title: eventTitleMap[event.eventType] ?? humanizeEventType(event.eventType),
    summary: getCustomerSafeLifecycleEventSummary(event),
    statusLabel: event.eventCategory === 'verified' ? 'Verified' : 'Administrative',
    statusTone: event.eventCategory === 'verified' ? 'verified' : 'administrative',
    typeLabel: sourceLabelMap[event.sourceType] ?? 'Lifecycle Event',
    typeTone:
      event.sourceType === 'lifecycle_summary'
        ? 'summary'
        : event.eventCategory === 'verified'
          ? 'verified'
          : 'administrative',
    icon: getTimelineEventIcon(event),
    sourceLabel: sourceLabelMap[event.sourceType] ?? 'Lifecycle Event',
    metaLabel:
      event.sourceType === 'lifecycle_summary'
        ? 'Reviewed summary decision'
        : event.eventCategory === 'verified'
          ? 'Inspection-backed milestone'
          : 'Operational milestone',
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
      title: 'Reviewed lifecycle summary',
      helperText:
        'This summary is customer-safe because a service adviser or super admin approved it after review.',
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

export const createEmptyCustomerVehicleLifecycleSnapshot = () => ({
  timelineState: 'timeline_empty',
  events: [],
  stats: {
    totalEvents: 0,
    verifiedEvents: 0,
    administrativeEvents: 0,
  },
  filters: customerTimelineFilters,
  summaryCard: buildCustomerLifecycleSummaryCard({
    summary: null,
    timelineEvents: [],
  }),
});

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

export const buildCustomerVehicleLifecycleSnapshot = ({
  timelineEvents = [],
  summary = null,
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
}) => {
  const timelineEvents = await listVehicleTimeline({
    vehicleId,
    accessToken,
  });

  return buildCustomerVehicleLifecycleSnapshot({
    timelineEvents,
    summary,
  });
};
