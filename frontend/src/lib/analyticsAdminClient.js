import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const request = async (path, options = {}) => {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
};

const buildAuthorizedHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLabel = (value, fallback = 'Unknown') => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const sortByCountDescending = (entries = []) =>
  [...entries].sort((left, right) => Number(right?.count ?? 0) - Number(left?.count ?? 0));

const sortByBookingCountDescending = (entries = []) =>
  [...entries].sort(
    (left, right) => Number(right?.bookingCount ?? 0) - Number(left?.bookingCount ?? 0),
  );

const normalizeDashboardAnalytics = (payload) => {
  const totalBookings = Number(payload?.totals?.totalBookings ?? 0);

  return {
    ...payload,
    refreshedAtLabel: formatDateTime(payload?.refreshedAt),
    totalSignals: [
      {
        key: 'totalBookings',
        label: 'Total Bookings',
        value: totalBookings,
        note: 'Derived from booking lifecycle records.',
      },
      {
        key: 'activeBookings',
        label: 'Active Bookings',
        value: Number(payload?.totals?.activeBookings ?? 0),
        note: 'Open booking work still moving through the shop.',
      },
      {
        key: 'finalizedServiceInvoices',
        label: 'Finalized Invoices',
        value: Number(payload?.totals?.finalizedServiceInvoices ?? 0),
        note: 'Service invoice-ready records, not payment settlement totals.',
      },
      {
        key: 'insuranceOpenInquiries',
        label: 'Open Insurance',
        value: Number(payload?.totals?.insuranceOpenInquiries ?? 0),
        note: 'Customer insurance inquiries still requiring staff action.',
      },
      {
        key: 'openBackJobs',
        label: 'Open Back-Jobs',
        value: Number(payload?.totals?.openBackJobs ?? 0),
        note: 'Returned-work cases that remain unresolved.',
      },
    ],
    salesSignals: [
      {
        label: 'Finalized Service Invoices',
        value: Number(payload?.sales?.finalizedInvoiceCount ?? 0),
      },
      {
        label: 'Booking Invoice Count',
        value: Number(payload?.sales?.bookingInvoiceCount ?? 0),
      },
      {
        label: 'Back-Job Invoice Count',
        value: Number(payload?.sales?.backJobInvoiceCount ?? 0),
      },
      {
        label: 'Latest Invoice Reference',
        value: payload?.sales?.latestInvoiceReference ?? 'No invoice yet',
      },
    ],
    insuranceSignals: [
      {
        label: 'Total Inquiries',
        value: Number(payload?.insurance?.totalInquiries ?? 0),
      },
      {
        label: 'Open Inquiries',
        value: Number(payload?.insurance?.openInquiries ?? 0),
      },
      {
        label: 'Needs Documents',
        value: Number(payload?.insurance?.needsDocuments ?? 0),
      },
      {
        label: 'Approved For Record',
        value: Number(payload?.insurance?.approvedForRecord ?? 0),
      },
      {
        label: 'Rejected',
        value: Number(payload?.insurance?.rejected ?? 0),
      },
    ],
    serviceDemandPreview: sortByBookingCountDescending(payload?.serviceDemandPreview).map((entry) => ({
      ...entry,
      bookingSharePercent:
        totalBookings > 0 ? ((Number(entry?.bookingCount ?? 0) / totalBookings) * 100).toFixed(1) : '0.0',
      sourceBookingCount: Array.isArray(entry?.sourceBookingIds) ? entry.sourceBookingIds.length : 0,
    })),
    peakHoursPreview: sortByBookingCountDescending(payload?.peakHoursPreview).map((entry) => ({
      ...entry,
      timeWindowLabel: `${entry?.startTime ?? '--:--'} - ${entry?.endTime ?? '--:--'}`,
      fillPercentLabel: `${Number(entry?.averageFillPercent ?? 0).toFixed(1)}%`,
      sourceBookingCount: Array.isArray(entry?.sourceBookingIds) ? entry.sourceBookingIds.length : 0,
    })),
  };
};

const normalizeOperationsAnalytics = (payload) => ({
  ...payload,
  refreshedAtLabel: formatDateTime(payload?.refreshedAt),
  bookingStatuses: sortByCountDescending(payload?.bookingStatuses).map((entry) => ({
    ...entry,
    label: formatLabel(entry?.status),
  })),
  jobOrderStatuses: sortByCountDescending(payload?.jobOrderStatuses).map((entry) => ({
    ...entry,
    label: formatLabel(entry?.status),
  })),
  peakHours: sortByBookingCountDescending(payload?.peakHours).map((entry) => ({
    ...entry,
    timeWindowLabel: `${entry?.startTime ?? '--:--'} - ${entry?.endTime ?? '--:--'}`,
    fillPercentLabel: `${Number(entry?.averageFillPercent ?? 0).toFixed(1)}%`,
  })),
  serviceDemand: sortByBookingCountDescending(payload?.serviceDemand).map((entry) => ({
    ...entry,
    lastBookedAtLabel: formatDateTime(entry?.lastBookedAt),
  })),
  serviceAdviserLoad: [...(payload?.serviceAdviserLoad ?? [])].sort(
    (left, right) => Number(right?.jobOrderCount ?? 0) - Number(left?.jobOrderCount ?? 0),
  ),
});

const normalizeBackJobsAnalytics = (payload) => ({
  ...payload,
  refreshedAtLabel: formatDateTime(payload?.refreshedAt),
  statuses: sortByCountDescending(payload?.statuses).map((entry) => ({
    ...entry,
    label: formatLabel(entry?.status),
  })),
  severities: sortByCountDescending(payload?.severities).map((entry) => ({
    ...entry,
    label: formatLabel(entry?.severity),
  })),
  repeatSources: [...(payload?.repeatSources ?? [])].sort(
    (left, right) => Number(right?.backJobCount ?? 0) - Number(left?.backJobCount ?? 0),
  ),
});

const normalizeLoyaltyAnalytics = (payload) => ({
  ...payload,
  refreshedAtLabel: formatDateTime(payload?.refreshedAt),
  transactionTypes: sortByCountDescending(payload?.transactionTypes).map((entry) => ({
    ...entry,
    label: formatLabel(entry?.transactionType),
    tone: Number(entry?.netPointsDelta ?? 0) >= 0 ? 'positive' : 'negative',
  })),
  topRewards: [...(payload?.topRewards ?? [])].sort(
    (left, right) => Number(right?.redemptionCount ?? 0) - Number(left?.redemptionCount ?? 0),
  ),
});

const INVOICE_BUCKET_LABELS = {
  due_today_or_future: 'Due Today Or Future',
  overdue_1_7: 'Overdue 1-7 Days',
  overdue_8_30: 'Overdue 8-30 Days',
  overdue_31_plus: 'Overdue 31+ Days',
};

const normalizeInvoiceAgingAnalytics = (payload) => ({
  ...payload,
  refreshedAtLabel: formatDateTime(payload?.refreshedAt),
  agingBuckets: sortByCountDescending(payload?.agingBuckets).map((entry) => ({
    ...entry,
    label: INVOICE_BUCKET_LABELS[entry?.bucket] ?? formatLabel(entry?.bucket),
  })),
  trackedInvoicePolicies: [...(payload?.trackedInvoicePolicies ?? [])].sort((left, right) =>
    String(right?.latestScheduledFor ?? '').localeCompare(String(left?.latestScheduledFor ?? '')),
  ).map((entry) => ({
    ...entry,
    latestScheduledForLabel: formatDateTime(entry?.latestScheduledFor),
  })),
});

const normalizeAuditTrailAnalytics = (payload) => ({
  ...payload,
  refreshedAtLabel: formatDateTime(payload?.refreshedAt),
  entries: [...(payload?.entries ?? [])]
    .sort((left, right) => String(right?.occurredAt ?? '').localeCompare(String(left?.occurredAt ?? '')))
    .map((entry) => ({
      ...entry,
      occurredAtLabel: formatDateTime(entry?.occurredAt),
      auditTypeLabel: formatLabel(entry?.auditType),
      actionLabel: formatLabel(entry?.action),
      actorRoleLabel: entry?.actorRole ? formatLabel(entry.actorRole) : null,
      actorLabel:
        entry?.actorUserId && entry?.actorRole
          ? `${formatLabel(entry.actorRole)} · ${entry.actorUserId}`
          : entry?.actorUserId ?? 'System',
      targetLabel: `${formatLabel(entry?.targetEntityType)} · ${entry?.targetEntityId ?? 'Unknown'}`,
      relatedCount: Array.isArray(entry?.relatedEntityIds) ? entry.relatedEntityIds.length : 0,
    })),
});

export const getDashboardAnalytics = async (accessToken) =>
  normalizeDashboardAnalytics(
    await request('/api/analytics/dashboard', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

export const getOperationsAnalytics = async (accessToken) =>
  normalizeOperationsAnalytics(
    await request('/api/analytics/operations', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

export const getBackJobsAnalytics = async (accessToken) =>
  normalizeBackJobsAnalytics(
    await request('/api/analytics/back-jobs', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

export const getLoyaltyAnalytics = async (accessToken) =>
  normalizeLoyaltyAnalytics(
    await request('/api/analytics/loyalty', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

export const getInvoiceAgingAnalytics = async (accessToken) =>
  normalizeInvoiceAgingAnalytics(
    await request('/api/analytics/invoice-aging', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

export const getAuditTrailAnalytics = async (accessToken) =>
  normalizeAuditTrailAnalytics(
    await request('/api/analytics/audit-trail', {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );

const SECTION_LOADERS = {
  dashboard: getDashboardAnalytics,
  operations: getOperationsAnalytics,
  backJobs: getBackJobsAnalytics,
  loyalty: getLoyaltyAnalytics,
  invoiceAging: getInvoiceAgingAnalytics,
  auditTrail: getAuditTrailAnalytics,
};

export const createEmptyAnalyticsSnapshot = () => ({
  dashboard: null,
  operations: null,
  backJobs: null,
  loyalty: null,
  invoiceAging: null,
  auditTrail: null,
});

export const loadAdminAnalyticsSnapshot = async ({ accessToken }) => {
  if (!accessToken) {
    throw new ApiError('Sign in as staff before loading admin analytics.', 401, {
      path: '/api/analytics/dashboard',
    });
  }

  const snapshot = createEmptyAnalyticsSnapshot();
  const errors = {};

  const results = await Promise.all(
    Object.entries(SECTION_LOADERS).map(async ([key, loadSection]) => {
      try {
        return {
          key,
          value: await loadSection(accessToken),
          error: null,
        };
      } catch (error) {
        return {
          key,
          value: null,
          error: error instanceof Error ? error.message : 'Unable to load analytics section.',
        };
      }
    }),
  );

  results.forEach(({ key, value, error }) => {
    snapshot[key] = value;

    if (error) {
      errors[key] = error;
    }
  });

  return { snapshot, errors };
};
