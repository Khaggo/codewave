import type { StaffPortalRole } from '../auth/staff-web-session';
import { analyticsRoutes } from './requests';
import type {
  AuditTrailAnalyticsResponse,
  BackJobsAnalyticsResponse,
  DashboardAnalyticsResponse,
  InvoiceAgingAnalyticsResponse,
  LoyaltyAnalyticsResponse,
  OperationsAnalyticsResponse,
} from './responses';

export type StaffAnalyticsRole = Extract<
  StaffPortalRole,
  'service_adviser' | 'super_admin'
>;

export type StaffAnalyticsLoadState =
  | 'analytics_ready'
  | 'analytics_loading'
  | 'analytics_loaded'
  | 'analytics_partial'
  | 'analytics_empty'
  | 'analytics_forbidden_role'
  | 'analytics_unauthorized'
  | 'analytics_failed';

export type AdminAnalyticsViewKey =
  | 'overview'
  | 'operations'
  | 'backJobs'
  | 'loyalty'
  | 'invoiceAging'
  | 'auditTrail'
  | 'summaryReview';

export interface AdminAnalyticsSnapshot {
  dashboard: DashboardAnalyticsResponse | null;
  operations: OperationsAnalyticsResponse | null;
  backJobs: BackJobsAnalyticsResponse | null;
  loyalty: LoyaltyAnalyticsResponse | null;
  invoiceAging: InvoiceAgingAnalyticsResponse | null;
  auditTrail: AuditTrailAnalyticsResponse | null;
}

export type AdminAnalyticsSectionKey = keyof AdminAnalyticsSnapshot;

export interface AdminAnalyticsViewTab {
  key: AdminAnalyticsViewKey;
  label: string;
  description: string;
  surface: 'staff-admin-web';
  truth: 'derived-analytics-read-model' | 'reviewed-lifecycle-summary';
  allowedRoles: StaffAnalyticsRole[];
}

export interface AdminAnalyticsSectionRule {
  key: AdminAnalyticsSectionKey;
  label: string;
  backendRoute: string;
  truth: 'derived-analytics-read-model';
  notes: string;
}

export const staffAnalyticsRoles: StaffAnalyticsRole[] = [
  'service_adviser',
  'super_admin',
];

export const adminAnalyticsTabs: AdminAnalyticsViewTab[] = [
  {
    key: 'overview',
    label: 'Overview',
    description:
      'Shop-health summary cards and read-model previews across bookings, invoices, insurance, and back jobs.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'operations',
    label: 'Operations',
    description:
      'Booking, slot, demand, and service-adviser workload trends derived from operational snapshots.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'backJobs',
    label: 'Back-Jobs',
    description:
      'Repeat-work, severity, and unresolved rework signals derived from back-job read models.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'loyalty',
    label: 'Loyalty',
    description:
      'Customer loyalty totals, transaction mix, and top reward usage from loyalty analytics snapshots.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'invoiceAging',
    label: 'Invoice Aging',
    description:
      'Reminder-rule-driven overdue buckets and tracked invoice policy states for finance follow-up.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'auditTrail',
    label: 'Audit Trail',
    description:
      'Sensitive staff actions, QA overrides, and release decisions from rebuildable audit read models.',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    allowedRoles: staffAnalyticsRoles,
  },
  {
    key: 'summaryReview',
    label: 'Summary Review',
    description:
      'Reviewed lifecycle and layman-summary verification remain visible from the same protected hub.',
    surface: 'staff-admin-web',
    truth: 'reviewed-lifecycle-summary',
    allowedRoles: staffAnalyticsRoles,
  },
];

export const analyticsDerivedStateLabel = 'Derived analytics snapshot';

export const analyticsFreshnessExpectation =
  'Analytics values come from rebuildable read models and can lag behind source-domain writes while refresh jobs settle.';

export const analyticsFutureApiGaps = [
  'Date-range filters are future work. The current dashboard reflects the latest derived snapshot only.',
  'CSV or PDF exports are future work. The web surface should present read-only metrics without inventing client-side exports.',
] as const;

export const adminAnalyticsSectionRules: AdminAnalyticsSectionRule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard Overview',
    backendRoute: 'GET /api/analytics/dashboard',
    truth: 'derived-analytics-read-model',
    notes:
      'Overview cards, service-demand previews, and peak-hour previews must stay tied to the latest rebuildable snapshot.',
  },
  {
    key: 'operations',
    label: 'Operations',
    backendRoute: 'GET /api/analytics/operations',
    truth: 'derived-analytics-read-model',
    notes:
      'Operations drill-ins show booking status, job-order status, slot load, service demand, and adviser workload without mutating source records.',
  },
  {
    key: 'backJobs',
    label: 'Back-Jobs',
    backendRoute: 'GET /api/analytics/back-jobs',
    truth: 'derived-analytics-read-model',
    notes:
      'Back-job analytics remain derived from back-job lineage and should not become a review or edit surface.',
  },
  {
    key: 'loyalty',
    label: 'Loyalty',
    backendRoute: 'GET /api/analytics/loyalty',
    truth: 'derived-analytics-read-model',
    notes:
      'Loyalty totals and top rewards stay read-only and must not leak reward-edit actions into the analytics hub.',
  },
  {
    key: 'invoiceAging',
    label: 'Invoice Aging',
    backendRoute: 'GET /api/analytics/invoice-aging',
    truth: 'derived-analytics-read-model',
    notes:
      'Invoice-aging counts are reminder-rule-derived and should not be presented as payment-settlement truth.',
  },
  {
    key: 'auditTrail',
    label: 'Audit Trail',
    backendRoute: 'GET /api/analytics/audit-trail',
    truth: 'derived-analytics-read-model',
    notes:
      'Audit visibility stays read-only and must expose sensitive action context without taking write ownership from source domains.',
  },
];

export const adminAnalyticsRoutes = {
  dashboard: analyticsRoutes.getAnalyticsDashboard,
  operations: analyticsRoutes.getAnalyticsOperations,
  backJobs: analyticsRoutes.getAnalyticsBackJobs,
  loyalty: analyticsRoutes.getAnalyticsLoyalty,
  invoiceAging: analyticsRoutes.getAnalyticsInvoiceAging,
  auditTrail: analyticsRoutes.getAnalyticsAuditTrail,
} as const;

export const createAdminAnalyticsSnapshot = (): AdminAnalyticsSnapshot => ({
  dashboard: null,
  operations: null,
  backJobs: null,
  loyalty: null,
  invoiceAging: null,
  auditTrail: null,
});

const hasPositiveNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const getLoadedAdminAnalyticsSectionCount = (
  snapshot?: Partial<AdminAnalyticsSnapshot> | null,
) =>
  snapshot
    ? Object.values(snapshot).filter(Boolean).length
    : 0;

export const hasAdminAnalyticsData = (
  snapshot?: Partial<AdminAnalyticsSnapshot> | null,
) => {
  if (!snapshot) {
    return false;
  }

  const dashboard = snapshot.dashboard;
  const operations = snapshot.operations;
  const backJobs = snapshot.backJobs;
  const loyalty = snapshot.loyalty;
  const invoiceAging = snapshot.invoiceAging;
  const auditTrail = snapshot.auditTrail;

  return Boolean(
    (dashboard &&
      (hasPositiveNumber(dashboard.totals.totalBookings) ||
        hasPositiveNumber(dashboard.totals.activeBookings) ||
        hasPositiveNumber(dashboard.totals.finalizedServiceInvoices) ||
        dashboard.serviceDemandPreview.length > 0 ||
        dashboard.peakHoursPreview.length > 0)) ||
      (operations &&
        (operations.bookingStatuses.length > 0 ||
          operations.jobOrderStatuses.length > 0 ||
          operations.peakHours.length > 0 ||
          operations.serviceDemand.length > 0 ||
          operations.serviceAdviserLoad.length > 0)) ||
      (backJobs &&
        (hasPositiveNumber(backJobs.totals.totalBackJobs) ||
          backJobs.statuses.length > 0 ||
          backJobs.severities.length > 0 ||
          backJobs.repeatSources.length > 0)) ||
      (loyalty &&
        (hasPositiveNumber(loyalty.totals.accountCount) ||
          hasPositiveNumber(loyalty.totals.totalPointsBalance) ||
          loyalty.transactionTypes.length > 0 ||
          loyalty.topRewards.length > 0)) ||
      (invoiceAging &&
        (hasPositiveNumber(invoiceAging.totals.trackedInvoices) ||
          invoiceAging.agingBuckets.length > 0 ||
          invoiceAging.trackedInvoicePolicies.length > 0)) ||
      (auditTrail &&
        (hasPositiveNumber(auditTrail.totals.totalSensitiveActions) ||
          auditTrail.entries.length > 0)),
  );
};

export const getAdminAnalyticsLoadState = (
  snapshot?: Partial<AdminAnalyticsSnapshot> | null,
  errors: Partial<Record<AdminAnalyticsSectionKey, string>> = {},
): Exclude<
  StaffAnalyticsLoadState,
  'analytics_loading' | 'analytics_forbidden_role' | 'analytics_unauthorized'
> => {
  const loadedCount = getLoadedAdminAnalyticsSectionCount(snapshot);
  const errorCount = Object.values(errors).filter(Boolean).length;

  if (loadedCount === 0 && errorCount === 0) {
    return 'analytics_ready';
  }

  if (loadedCount === 0 && errorCount > 0) {
    return 'analytics_failed';
  }

  if (loadedCount > 0 && errorCount > 0) {
    return 'analytics_partial';
  }

  return hasAdminAnalyticsData(snapshot)
    ? 'analytics_loaded'
    : 'analytics_empty';
};

export const canStaffReadAnalytics = (
  role?: string | null,
): role is StaffAnalyticsRole =>
  staffAnalyticsRoles.includes(role as StaffAnalyticsRole);

export const getAnalyticsFreshnessTone = (
  refreshedAt?: string | null,
): 'fresh' | 'watch' | 'stale' | 'unknown' => {
  if (!refreshedAt) {
    return 'unknown';
  }

  const refreshedAtMs = new Date(refreshedAt).getTime();

  if (!Number.isFinite(refreshedAtMs)) {
    return 'unknown';
  }

  const ageMinutes = (Date.now() - refreshedAtMs) / 60000;

  if (ageMinutes > 120) {
    return 'stale';
  }

  if (ageMinutes > 30) {
    return 'watch';
  }

  return 'fresh';
};

export const adminAnalyticsContractSources = [
  'docs/architecture/domains/main-service/analytics.md',
  'docs/architecture/tasks/05-client-integration/T523-admin-analytics-dashboard-web-flow.md',
  'docs/contracts/T113-admin-dashboard-analytics-v1.md',
  'docs/contracts/T523-admin-analytics-dashboard-web-flow.md',
  'backend/apps/main-service/src/modules/analytics/controllers/analytics.controller.ts',
  'frontend/src/lib/analyticsAdminClient.js',
  'frontend/src/screens/AdminAnalyticsWorkspace.js',
] as const;
