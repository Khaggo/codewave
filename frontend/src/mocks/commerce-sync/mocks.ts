import type { InvoiceResponse } from '../../lib/api/generated/invoice-payments/responses';
import type { NotificationResponse } from '../../lib/api/generated/notifications/responses';
import type { OrderResponse } from '../../lib/api/generated/orders/responses';
import {
  customerDerivedStateStatusDescriptions,
  customerDerivedStateSyncScenarios,
  type CustomerDerivedStateScenario,
  type CustomerDerivedStateSurfaceKey,
  type CustomerDerivedSyncStatus,
} from '../../lib/api/generated/commerce-sync/customer-derived-state-sync';
import { paidInvoiceMock, invoiceMock } from '../invoice-payments/mocks';
import { checkoutOrderMock, trackedOrderMock } from '../orders/mocks';

export interface CustomerDerivedStateScenarioMock {
  scenario: CustomerDerivedStateScenario;
  sourceFactReference: string;
  order: OrderResponse | null;
  invoice: InvoiceResponse | null;
  notifications: NotificationResponse[];
  loyalty: {
    pointsBalance: number;
    lastAccruedAt: string | null;
    recentActivityCount: number;
    note: string;
  };
}

const requireScenario = (
  scenarioId: CustomerDerivedStateScenario['scenarioId'],
): CustomerDerivedStateScenario => {
  const scenario = customerDerivedStateSyncScenarios.find((entry) => entry.scenarioId === scenarioId);

  if (!scenario) {
    throw new Error(`Unknown derived-state scenario: ${scenarioId}`);
  }

  return scenario;
};

const invoiceReminderQueuedMock: NotificationResponse = {
  id: 'notification-invoice-reminder-queued-1',
  userId: checkoutOrderMock.customerUserId,
  category: 'invoice_aging',
  channel: 'email',
  sourceType: 'invoice_payment',
  sourceId: invoiceMock.id,
  title: 'Invoice reminder scheduled',
  message: 'Your unpaid invoice is queued for reminder delivery once notification sync completes.',
  status: 'queued',
  dedupeKey: `notification:order.invoice_issued:${invoiceMock.id}:aging`,
  scheduledFor: '2026-05-14T06:00:00.000Z',
  deliveredAt: null,
  createdAt: '2026-05-14T05:05:00.000Z',
  updatedAt: '2026-05-14T05:05:00.000Z',
  attempts: [],
};

const staleInvoiceReminderMock: NotificationResponse = {
  id: 'notification-invoice-reminder-stale-1',
  userId: trackedOrderMock.customerUserId,
  category: 'invoice_aging',
  channel: 'email',
  sourceType: 'invoice_payment',
  sourceId: paidInvoiceMock.id,
  title: 'Invoice reminder still visible',
  message:
    'The invoice reminder is still visible even though invoice tracking already shows payment settlement.',
  status: 'sent',
  dedupeKey: `notification:order.invoice_issued:${paidInvoiceMock.id}:aging`,
  scheduledFor: null,
  deliveredAt: '2026-05-16T09:10:00.000Z',
  createdAt: '2026-05-16T09:00:00.000Z',
  updatedAt: '2026-05-16T09:10:00.000Z',
  attempts: [
    {
      id: 'notification-invoice-reminder-stale-attempt-1',
      notificationId: 'notification-invoice-reminder-stale-1',
      attemptNumber: 1,
      status: 'sent',
      providerMessageId: 'smtp-invoice-reminder-stale-1',
      errorMessage: null,
      attemptedAt: '2026-05-16T09:10:00.000Z',
    },
  ],
};

export const pendingDerivedStateScenarioMock: CustomerDerivedStateScenarioMock = {
  scenario: requireScenario('invoice_issued_notification_pending'),
  sourceFactReference: invoiceMock.invoiceNumber,
  order: checkoutOrderMock,
  invoice: invoiceMock,
  notifications: [invoiceReminderQueuedMock],
  loyalty: {
    pointsBalance: 0,
    lastAccruedAt: null,
    recentActivityCount: 0,
    note: 'Loyalty is unaffected because invoice issuance is ecommerce truth, not a service-payment fact.',
  },
};

export const staleDerivedStateScenarioMock: CustomerDerivedStateScenarioMock = {
  scenario: requireScenario('invoice_paid_notification_stale'),
  sourceFactReference: paidInvoiceMock.invoiceNumber,
  order: trackedOrderMock,
  invoice: paidInvoiceMock,
  notifications: [staleInvoiceReminderMock],
  loyalty: {
    pointsBalance: 0,
    lastAccruedAt: null,
    recentActivityCount: 0,
    note: 'The invoice owner route is current, but the notification read model still needs reminder cleanup.',
  },
};

export const fullySyncedDerivedStateScenarioMock: CustomerDerivedStateScenarioMock = {
  scenario: requireScenario('service_payment_loyalty_fully_synced'),
  sourceFactReference: 'SRV-INV-2026-0007',
  order: null,
  invoice: null,
  notifications: [],
  loyalty: {
    pointsBalance: 1340,
    lastAccruedAt: '2026-05-20T08:40:00.000Z',
    recentActivityCount: 3,
    note: 'The loyalty ledger already reflects the paid-service fact without requiring any ecommerce order route.',
  },
};

export const customerDerivedStateScenarioMocks = [
  pendingDerivedStateScenarioMock,
  staleDerivedStateScenarioMock,
  fullySyncedDerivedStateScenarioMock,
];

export const customerDerivedStateStatusExamples: Record<
  CustomerDerivedSyncStatus,
  {
    surfaceKey: CustomerDerivedStateSurfaceKey;
    description: string;
  }
> = {
  pending_sync: {
    surfaceKey: 'notification_feed',
    description: customerDerivedStateStatusDescriptions.pending_sync,
  },
  stale_snapshot: {
    surfaceKey: 'notification_feed',
    description: customerDerivedStateStatusDescriptions.stale_snapshot,
  },
  fully_synced: {
    surfaceKey: 'loyalty_balance',
    description: customerDerivedStateStatusDescriptions.fully_synced,
  },
};
