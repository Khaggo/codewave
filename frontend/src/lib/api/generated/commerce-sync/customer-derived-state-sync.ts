import type { RouteContract } from '../shared';
import { loyaltyRoutes } from '../loyalty/requests';
import { customerNotificationContractSources } from '../notifications/customer-mobile-notifications';
import { customerMobileOrderHistoryRoutes } from '../orders/customer-mobile-order-history';

export type CustomerDerivedStateSurfaceKey =
  | 'order_history'
  | 'invoice_tracking'
  | 'notification_feed'
  | 'loyalty_balance'
  | 'loyalty_activity';

export type CustomerDerivedStateConsistencyModel =
  | 'owner_route_truth'
  | 'event_driven_read_model';

export type CustomerDerivedSyncStatus =
  | 'pending_sync'
  | 'fully_synced'
  | 'stale_snapshot';

export interface CustomerDerivedStateGlossaryEntry {
  surfaceKey: CustomerDerivedStateSurfaceKey;
  surface: 'customer-mobile';
  ownerDomain: string;
  sourceDomains: string[];
  consistencyModel: CustomerDerivedStateConsistencyModel;
  routeContracts: RouteContract[];
  description: string;
  customerCopyRule: string;
  directJoinWarning: string;
}

export interface CustomerDerivedStateScenarioSurface {
  surfaceKey: CustomerDerivedStateSurfaceKey;
  syncStatus: CustomerDerivedSyncStatus;
  reason: string;
}

export interface CustomerDerivedStateScenario {
  scenarioId:
    | 'invoice_issued_notification_pending'
    | 'invoice_paid_notification_stale'
    | 'service_payment_loyalty_fully_synced';
  sourceFact:
    | 'order.invoice_issued'
    | 'invoice.payment_recorded'
    | 'service.payment_recorded';
  ownerDomain: string;
  summary: string;
  surfaces: CustomerDerivedStateScenarioSurface[];
}

export const customerDerivedStateStatusDescriptions: Record<
  CustomerDerivedSyncStatus,
  string
> = {
  pending_sync:
    'The owner domain already has the source fact, but the downstream customer-facing read model has not caught up yet.',
  fully_synced:
    'The customer-facing surface reflects the latest owner-domain fact without requiring hidden cross-service joins.',
  stale_snapshot:
    'The customer-facing surface still reflects an older downstream snapshot even though the owner-domain fact has moved on.',
};

export const customerDerivedStateGlossary: CustomerDerivedStateGlossaryEntry[] = [
  {
    surfaceKey: 'order_history',
    surface: 'customer-mobile',
    ownerDomain: 'ecommerce.orders',
    sourceDomains: ['ecommerce.orders'],
    consistencyModel: 'owner_route_truth',
    routeContracts: [
      customerMobileOrderHistoryRoutes.listOrdersByUserId,
      customerMobileOrderHistoryRoutes.getOrderById,
    ],
    description:
      'Customer order history is direct ecommerce order truth and should not wait for notifications or loyalty read models.',
    customerCopyRule:
      'Present order history as the owner route for shop checkout state, while explaining that notifications and loyalty update separately.',
    directJoinWarning:
      'Do not infer notification delivery, loyalty accrual, or workshop status from ecommerce order rows alone.',
  },
  {
    surfaceKey: 'invoice_tracking',
    surface: 'customer-mobile',
    ownerDomain: 'ecommerce.invoice-payments',
    sourceDomains: ['ecommerce.invoice-payments'],
    consistencyModel: 'owner_route_truth',
    routeContracts: [customerMobileOrderHistoryRoutes.getOrderInvoice],
    description:
      'Customer invoice tracking is direct ecommerce invoice truth for issued, overdue, partially paid, paid, or cancelled states.',
    customerCopyRule:
      'Treat invoice status and payment entries as backend facts, while telling customers that reminder visibility may refresh later.',
    directJoinWarning:
      'Do not assume invoice status changes instantly rewrite notification history or loyalty projections.',
  },
  {
    surfaceKey: 'notification_feed',
    surface: 'customer-mobile',
    ownerDomain: 'main-service.notifications',
    sourceDomains: [
      'main-service.bookings',
      'main-service.insurance',
      'main-service.back-jobs',
      'main-service.job-orders',
      'ecommerce.invoice-payments',
    ],
    consistencyModel: 'event_driven_read_model',
    routeContracts: [customerNotificationContractSources.listNotifications],
    description:
      'Customer notifications are an async read model built from operational facts emitted by multiple source domains.',
    customerCopyRule:
      'Explain that reminders and updates appear after the notification service processes source-domain facts.',
    directJoinWarning:
      'Do not treat the notification feed as the canonical owner of bookings, invoice balances, or loyalty balances.',
  },
  {
    surfaceKey: 'loyalty_balance',
    surface: 'customer-mobile',
    ownerDomain: 'main-service.loyalty',
    sourceDomains: ['main-service.job-orders'],
    consistencyModel: 'event_driven_read_model',
    routeContracts: [loyaltyRoutes.getLoyaltyAccount],
    description:
      'Customer loyalty balance is a derived ledger owned by main-service loyalty and refreshed from paid-service facts.',
    customerCopyRule:
      'Describe loyalty as service-earned points that post after the loyalty ledger processes the paid-service fact.',
    directJoinWarning:
      'Do not infer loyalty accrual directly from ecommerce order or invoice routes, even when those routes change first.',
  },
  {
    surfaceKey: 'loyalty_activity',
    surface: 'customer-mobile',
    ownerDomain: 'main-service.loyalty',
    sourceDomains: ['main-service.job-orders', 'main-service.loyalty'],
    consistencyModel: 'event_driven_read_model',
    routeContracts: [loyaltyRoutes.getLoyaltyTransactions],
    description:
      'Customer loyalty activity is the append-only loyalty ledger view for service-earned points, redemptions, and manual adjustments.',
    customerCopyRule:
      'Keep transaction wording anchored to the loyalty ledger and separate from ecommerce order history or invoice history.',
    directJoinWarning:
      'Do not promise that every ecommerce payment or invoice change creates a loyalty row on the same timeline.',
  },
];

export const customerDerivedStateSyncScenarios: CustomerDerivedStateScenario[] = [
  {
    scenarioId: 'invoice_issued_notification_pending',
    sourceFact: 'order.invoice_issued',
    ownerDomain: 'ecommerce.invoice-payments',
    summary:
      'The ecommerce invoice route is ready, but the downstream notification reminder has not appeared yet.',
    surfaces: [
      {
        surfaceKey: 'order_history',
        syncStatus: 'fully_synced',
        reason:
          'The order exists in ecommerce order history immediately after checkout and invoice issuance.',
      },
      {
        surfaceKey: 'invoice_tracking',
        syncStatus: 'fully_synced',
        reason:
          'The invoice tracking route already shows the issued invoice and amount due.',
      },
      {
        surfaceKey: 'notification_feed',
        syncStatus: 'pending_sync',
        reason:
          'The reminder depends on notifications consuming the invoice-issued fact asynchronously.',
      },
    ],
  },
  {
    scenarioId: 'invoice_paid_notification_stale',
    sourceFact: 'invoice.payment_recorded',
    ownerDomain: 'ecommerce.invoice-payments',
    summary:
      'The invoice route already shows payment settlement, but the notification read model still shows an older reminder snapshot.',
    surfaces: [
      {
        surfaceKey: 'invoice_tracking',
        syncStatus: 'fully_synced',
        reason:
          'The invoice owner route reflects the paid or settled amount immediately after payment recording.',
      },
      {
        surfaceKey: 'notification_feed',
        syncStatus: 'stale_snapshot',
        reason:
          'Reminder cancellation or follow-up cleanup may lag behind the invoice-payment fact.',
      },
    ],
  },
  {
    scenarioId: 'service_payment_loyalty_fully_synced',
    sourceFact: 'service.payment_recorded',
    ownerDomain: 'main-service.job-orders',
    summary:
      'A paid-service fact was processed and the loyalty ledger already reflects the updated balance and activity.',
    surfaces: [
      {
        surfaceKey: 'loyalty_balance',
        syncStatus: 'fully_synced',
        reason:
          'The loyalty account now reflects the latest paid-service accrual outcome.',
      },
      {
        surfaceKey: 'loyalty_activity',
        syncStatus: 'fully_synced',
        reason:
          'The loyalty ledger includes the service-earned transaction with its own append-only activity row.',
      },
    ],
  },
];

export const customerDerivedStateContractSources = [
  'docs/architecture/domains/ecommerce/commerce-events.md',
  'docs/architecture/domains/main-service/notifications.md',
  'docs/architecture/domains/main-service/loyalty.md',
  'docs/architecture/tasks/05-client-integration/T528-commerce-and-main-service-derived-state-sync.md',
  'mobile/src/lib/notificationClient.js',
  'mobile/src/lib/ecommerceCheckoutClient.js',
  'mobile/src/lib/loyaltyClient.js',
  'mobile/src/screens/Dashboard.js',
] as const;
