import type {
  LoyaltyAccountResponse,
  LoyaltyAccrualPlan,
  LoyaltyTransactionResponse,
  RewardRedemptionResponse,
  RewardResponse,
  ServiceInvoiceFinalizedEvent,
} from '../../lib/api/generated/loyalty/responses';
import type { InvoicePaymentRecordedEvent } from '../../lib/api/generated/commerce-events/responses';

export const serviceInvoiceFinalizedEventMock: ServiceInvoiceFinalizedEvent = {
  eventId: 'event-service-invoice-finalized-1',
  name: 'service.invoice_finalized',
  version: 1,
  producer: 'main-service',
  sourceDomain: 'main-service.job-orders',
  occurredAt: '2026-05-14T08:00:00.000Z',
  payload: {
    jobOrderId: 'job-order-1',
    invoiceRecordId: 'service-invoice-record-1',
    invoiceReference: 'SRV-INV-2026-0001',
    customerUserId: 'customer-1',
    vehicleId: 'vehicle-1',
    serviceAdviserUserId: 'service-adviser-1',
    serviceAdviserCode: 'SA-0001',
    finalizedByUserId: 'super-admin-1',
    sourceType: 'booking',
    sourceId: 'booking-1',
  },
};

export const purchasePaymentRecordedEventMock: InvoicePaymentRecordedEvent = {
  eventId: 'event-invoice-payment-recorded-2',
  name: 'invoice.payment_recorded',
  version: 1,
  producer: 'ecommerce-service',
  sourceDomain: 'ecommerce.invoice-payments',
  occurredAt: '2026-05-14T09:00:00.000Z',
  payload: {
    invoiceId: 'invoice-2',
    orderId: 'order-2',
    customerUserId: 'customer-1',
    invoiceNumber: 'INV-2026-0002',
    paymentEntryId: 'payment-entry-2',
    amountCents: 159900,
    paymentMethod: 'bank_transfer',
    receivedAt: '2026-05-14T09:00:00.000Z',
    invoiceStatus: 'paid',
    amountPaidCents: 159900,
    amountDueCents: 0,
    currencyCode: 'PHP',
  },
};

export const serviceLoyaltyAccrualPlanMock: LoyaltyAccrualPlan = {
  triggerName: 'service.invoice_finalized',
  sourceDomain: 'main-service.job-orders',
  loyaltyUserId: 'customer-1',
  accrualKind: 'service_invoice',
  idempotencyKey: 'loyalty:service.invoice_finalized:service-invoice-record-1',
  sourceReference: 'service-invoice-record-1',
  policyKey: 'loyalty.service.invoice_finalized.v1',
  pointsInput: {
    mode: 'service_invoice_fact',
    invoiceReference: 'SRV-INV-2026-0001',
  },
  duplicateStrategy: 'ignore_same_idempotency_key',
  reversalStrategy: 'manual_adjustment_until_service_reversal_event_exists',
};

export const purchaseLoyaltyAccrualPlanMock: LoyaltyAccrualPlan = {
  triggerName: 'invoice.payment_recorded',
  sourceDomain: 'ecommerce.invoice-payments',
  loyaltyUserId: 'customer-1',
  accrualKind: 'purchase_payment',
  idempotencyKey: 'loyalty:invoice.payment_recorded:payment-entry-2',
  sourceReference: 'payment-entry-2',
  policyKey: 'loyalty.invoice.payment_recorded.v1',
  pointsInput: {
    mode: 'payment_amount',
    amountCents: 159900,
    currencyCode: 'PHP',
  },
  duplicateStrategy: 'ignore_same_idempotency_key',
  reversalStrategy: 'compensating_debit_when_payment_reversal_or_refund_event_arrives',
};

export const loyaltyEventMocks = [
  serviceInvoiceFinalizedEventMock,
  purchasePaymentRecordedEventMock,
];

export const loyaltyAccrualPlanMocks = [
  serviceLoyaltyAccrualPlanMock,
  purchaseLoyaltyAccrualPlanMock,
];

export const loyaltyAccountMock: LoyaltyAccountResponse = {
  id: 'loyalty-account-1',
  userId: 'customer-1',
  pointsBalance: 131,
  lifetimePointsEarned: 131,
  lifetimePointsRedeemed: 0,
  lastAccruedAt: '2026-05-14T09:00:00.000Z',
  createdAt: '2026-05-14T08:00:00.000Z',
  updatedAt: '2026-05-14T09:00:00.000Z',
};

export const loyaltyTransactionsMock: LoyaltyTransactionResponse[] = [
  {
    id: 'loyalty-transaction-2',
    loyaltyAccountId: 'loyalty-account-1',
    transactionType: 'accrual',
    sourceType: 'purchase_payment',
    sourceReference: 'payment-entry-2',
    idempotencyKey: 'loyalty:invoice.payment_recorded:payment-entry-2',
    policyKey: 'loyalty.invoice_payment_recorded.v1',
    pointsDelta: 31,
    resultingBalance: 131,
    metadata: {
      triggerName: 'invoice.payment_recorded',
      sourceDomain: 'ecommerce.invoice-payments',
      duplicateStrategy: 'ignore_same_idempotency_key',
    },
    createdAt: '2026-05-14T09:00:00.000Z',
  },
  {
    id: 'loyalty-transaction-1',
    loyaltyAccountId: 'loyalty-account-1',
    transactionType: 'accrual',
    sourceType: 'service_invoice',
    sourceReference: 'service-invoice-record-1',
    idempotencyKey: 'loyalty:service.invoice_finalized:service-invoice-record-1',
    policyKey: 'loyalty.service.invoice_finalized.v1',
    pointsDelta: 100,
    resultingBalance: 100,
    metadata: {
      triggerName: 'service.invoice_finalized',
      sourceDomain: 'main-service.job-orders',
      duplicateStrategy: 'ignore_same_idempotency_key',
    },
    createdAt: '2026-05-14T08:00:00.000Z',
  },
];

export const activeRewardMock: RewardResponse = {
  id: 'reward-1',
  name: 'Free wheel alignment',
  description: 'Redeem for one complimentary wheel alignment service.',
  rewardType: 'service_voucher',
  pointsCost: 100,
  discountPercent: null,
  status: 'active',
  createdByUserId: 'super-admin-1',
  updatedByUserId: 'super-admin-1',
  createdAt: '2026-05-14T08:00:00.000Z',
  updatedAt: '2026-05-14T08:00:00.000Z',
};

export const inactiveRewardMock: RewardResponse = {
  ...activeRewardMock,
  status: 'inactive',
  updatedAt: '2026-05-14T10:30:00.000Z',
  audits: [
    {
      id: 'reward-audit-1',
      rewardId: 'reward-1',
      actorUserId: 'super-admin-1',
      action: 'created',
      reason: 'Initial catalog launch.',
      snapshot: {
        name: 'Free wheel alignment',
        description: 'Redeem for one complimentary wheel alignment service.',
        rewardType: 'service_voucher',
        pointsCost: 100,
        discountPercent: null,
        status: 'active',
      },
      createdAt: '2026-05-14T08:00:00.000Z',
    },
    {
      id: 'reward-audit-2',
      rewardId: 'reward-1',
      actorUserId: 'super-admin-1',
      action: 'deactivated',
      reason: 'Catalog paused for audit.',
      snapshot: {
        name: 'Free wheel alignment',
        description: 'Redeem for one complimentary wheel alignment service.',
        rewardType: 'service_voucher',
        pointsCost: 100,
        discountPercent: null,
        status: 'inactive',
      },
      createdAt: '2026-05-14T10:30:00.000Z',
    },
  ],
};

export const rewardRedemptionMock: RewardRedemptionResponse = {
  id: 'reward-redemption-1',
  loyaltyAccountId: 'loyalty-account-1',
  userId: 'customer-1',
  rewardId: 'reward-1',
  rewardNameSnapshot: 'Free wheel alignment',
  pointsCostSnapshot: 100,
  redeemedByUserId: 'customer-1',
  note: 'Redeemed during pickup.',
  pointsBalanceAfter: 31,
  transaction: {
    id: 'loyalty-transaction-3',
    loyaltyAccountId: 'loyalty-account-1',
    transactionType: 'redemption',
    sourceType: 'reward_redemption',
    sourceReference: 'reward-1',
    idempotencyKey: null,
    policyKey: 'loyalty.reward_redemption.v1',
    pointsDelta: -100,
    resultingBalance: 31,
    metadata: {
      rewardNameSnapshot: 'Free wheel alignment',
      redeemedByUserId: 'customer-1',
      note: 'Redeemed during pickup.',
    },
    createdAt: '2026-05-14T10:00:00.000Z',
  },
  createdAt: '2026-05-14T10:00:00.000Z',
};
