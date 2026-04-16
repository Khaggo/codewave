import type { RouteContract } from '../shared';

export const analyticsRoutes: Record<string, RouteContract> = {
  getAnalyticsDashboard: {
    method: 'GET',
    path: '/api/analytics/dashboard',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns the admin dashboard overview from the derived analytics snapshot, not from transactional source tables.',
  },
  getAnalyticsOperations: {
    method: 'GET',
    path: '/api/analytics/operations',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns booking demand, peak-hour, and service-adviser workload analytics from rebuildable read models.',
  },
  getAnalyticsBackJobs: {
    method: 'GET',
    path: '/api/analytics/back-jobs',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns repeat-source, status, and severity trends for back jobs from derived analytics snapshots.',
  },
  getAnalyticsLoyalty: {
    method: 'GET',
    path: '/api/analytics/loyalty',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns loyalty usage summaries derived from loyalty accounts, transactions, and redemption history.',
  },
  getAnalyticsInvoiceAging: {
    method: 'GET',
    path: '/api/analytics/invoice-aging',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns invoice-aging reminder analytics derived from notification reminder rules, not from direct payment settlement logic.',
  },
  getAnalyticsAuditTrail: {
    method: 'GET',
    path: '/api/analytics/audit-trail',
    status: 'live',
    source: 'swagger',
    notes:
      'Live route. Returns a rebuildable audit trail for staff-admin actions, QA overrides, and release decisions without taking ownership away from the source domains.',
  },
};
