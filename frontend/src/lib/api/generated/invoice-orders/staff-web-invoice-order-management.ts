import type { StaffPortalRole } from '../auth/staff-web-session';
import { analyticsRoutes } from '../analytics/requests';
import { invoicePaymentRoutes } from '../invoice-payments/requests';
import { jobOrdersRoutes } from '../job-orders/requests';
import { ordersRoutes } from '../orders/requests';
import type { RouteContract } from '../shared';

export type StaffInvoiceOrderManagementRole = Extract<
  StaffPortalRole,
  'service_adviser' | 'super_admin'
>;

export type StaffInvoiceOrderSurfaceKey =
  | 'service_invoices'
  | 'ecommerce_orders'
  | 'invoice_aging';

export type StaffInvoiceOrderLoadState =
  | 'invoice_order_ready'
  | 'invoice_order_loading'
  | 'invoice_order_loaded'
  | 'invoice_order_partial'
  | 'invoice_order_empty'
  | 'invoice_order_forbidden_role'
  | 'invoice_order_unauthorized'
  | 'invoice_order_runtime_unavailable'
  | 'invoice_order_failed';

export interface StaffInvoiceOrderSurfaceRule {
  key: StaffInvoiceOrderSurfaceKey;
  label: string;
  ownerDomain: 'main-service.job-orders' | 'ecommerce.orders' | 'analytics';
  surface: 'staff-admin-web';
  truth:
    | 'synchronous-job-order-record'
    | 'ecommerce-owner-route'
    | 'derived-analytics-read-model';
  routes: RouteContract[];
  allowedRoles: StaffInvoiceOrderManagementRole[];
  notes: string;
}

export interface StaffInvoiceOrderApiGap {
  key: string;
  route: string;
  label: string;
  notes: string;
}

export const staffInvoiceOrderManagementRoles: StaffInvoiceOrderManagementRole[] = [
  'service_adviser',
  'super_admin',
];

export const staffInvoiceOrderSurfaceRules: StaffInvoiceOrderSurfaceRule[] = [
  {
    key: 'service_invoices',
    label: 'Service Invoices',
    ownerDomain: 'main-service.job-orders',
    surface: 'staff-admin-web',
    truth: 'synchronous-job-order-record',
    routes: [
      jobOrdersRoutes.getJobOrderById,
      jobOrdersRoutes.finalizeJobOrder,
      jobOrdersRoutes.recordInvoicePayment,
    ],
    allowedRoles: staffInvoiceOrderManagementRoles,
    notes:
      'Service invoice readiness and manual payment recording remain tied to finalized job orders.',
  },
  {
    key: 'ecommerce_orders',
    label: 'Ecommerce Orders',
    ownerDomain: 'ecommerce.orders',
    surface: 'staff-admin-web',
    truth: 'ecommerce-owner-route',
    routes: [
      ordersRoutes.getOrderById,
      invoicePaymentRoutes.getOrderInvoice,
      invoicePaymentRoutes.getInvoiceById,
    ],
    allowedRoles: staffInvoiceOrderManagementRoles,
    notes:
      'The web hub may read a known ecommerce order or invoice record, but broad staff queues need dedicated list endpoints.',
  },
  {
    key: 'invoice_aging',
    label: 'Invoice Aging',
    ownerDomain: 'analytics',
    surface: 'staff-admin-web',
    truth: 'derived-analytics-read-model',
    routes: [analyticsRoutes.getAnalyticsInvoiceAging],
    allowedRoles: staffInvoiceOrderManagementRoles,
    notes:
      'Invoice-aging cards come from reminder-rule analytics and must not be presented as direct payment settlement truth.',
  },
];

export const staffInvoiceOrderActionRoutes = {
  serviceInvoicePayment: jobOrdersRoutes.recordInvoicePayment,
  ecommerceOrderStatus: ordersRoutes.updateOrderStatus,
  ecommerceOrderCancel: ordersRoutes.cancelOrder,
  ecommerceInvoicePaymentEntry: invoicePaymentRoutes.createInvoicePaymentEntry,
  ecommerceInvoiceStatus: invoicePaymentRoutes.updateInvoiceStatus,
} as const;

export const staffInvoiceOrderKnownApiGaps: StaffInvoiceOrderApiGap[] = [
  {
    key: 'staff-ecommerce-order-list',
    route: 'GET /api/orders?status=&invoiceStatus=',
    label: 'Staff ecommerce order queue',
    notes:
      'The current ecommerce contract exposes known-order reads and customer-owned history, but not a broad staff/admin order list.',
  },
  {
    key: 'staff-ecommerce-invoice-list',
    route: 'GET /api/invoices?status=&agingBucket=',
    label: 'Staff invoice queue',
    notes:
      'Invoice detail routes are live, but there is no broad invoice list for staff filtering or aging follow-up outside analytics.',
  },
  {
    key: 'finance-export-date-range',
    route: 'GET /api/invoices/export?from=&to=',
    label: 'Finance export and date range',
    notes:
      'Analytics date-range filters and exports remain future work; the current hub should stay read-only and link to live owner routes.',
  },
];

export const staffInvoiceOrderPaymentCopy =
  'Manual payment entries are backend records only. This product does not claim bank, card, or gateway settlement.';

export const canStaffReadInvoiceOrderManagement = (user?: {
  role?: string | null;
  isActive?: boolean | null;
} | null): user is { role: StaffInvoiceOrderManagementRole; isActive?: boolean | null } =>
  Boolean(
    user?.isActive !== false &&
      staffInvoiceOrderManagementRoles.includes(user?.role as StaffInvoiceOrderManagementRole),
  );

export const getStaffInvoiceOrderLoadState = ({
  hasSession,
  canRead,
  hasData,
  partialFailure,
  runtimeUnavailable,
}: {
  hasSession: boolean;
  canRead: boolean;
  hasData: boolean;
  partialFailure?: boolean;
  runtimeUnavailable?: boolean;
}): StaffInvoiceOrderLoadState => {
  if (!hasSession) {
    return 'invoice_order_unauthorized';
  }

  if (!canRead) {
    return 'invoice_order_forbidden_role';
  }

  if (runtimeUnavailable) {
    return 'invoice_order_runtime_unavailable';
  }

  if (partialFailure && hasData) {
    return 'invoice_order_partial';
  }

  if (partialFailure) {
    return 'invoice_order_failed';
  }

  return hasData ? 'invoice_order_loaded' : 'invoice_order_empty';
};

export const staffInvoiceOrderContractSources = [
  'docs/architecture/domains/main-service/job-orders.md',
  'docs/architecture/domains/ecommerce/orders.md',
  'docs/architecture/domains/ecommerce/invoice-payments.md',
  'docs/architecture/domains/main-service/analytics.md',
  'docs/architecture/tasks/05-client-integration/T538-web-invoice-order-management-navigation-surface.md',
  'frontend/src/lib/jobOrderWorkbenchClient.js',
  'frontend/src/lib/analyticsAdminClient.js',
  'frontend/src/lib/invoiceOrderManagementClient.js',
  'frontend/src/screens/InvoiceOrderManagementWorkspace.js',
] as const;
