import {
  loyaltyForbiddenErrorMock,
  loyaltyInactiveRewardErrorMock,
  loyaltyInsufficientPointsErrorMock,
} from '../../lib/api/generated/loyalty/errors';
import type {
  LoyaltyAccountResponse,
  LoyaltyAccrualPlan,
  LoyaltyTransactionResponse,
  RewardRedemptionResponse,
  RewardResponse,
  ServicePaymentRecordedEvent,
} from '../../lib/api/generated/loyalty/responses';
import type { InvoicePaymentRecordedEvent } from '../../lib/api/generated/commerce-events/responses';

export const servicePaymentRecordedEventMock: ServicePaymentRecordedEvent = {
  eventId: 'event-service-payment-recorded-1',
  name: 'service.payment_recorded',
  version: 1,
  producer: 'main-service',
  sourceDomain: 'main-service.job-orders',
  occurredAt: '2026-05-14T08:00:00.000Z',
  payload: {
    invoiceRecordId: 'service-invoice-record-1',
    invoiceReference: 'SRV-INV-2026-0001',
    customerUserId: 'customer-1',
    amountPaidCents: 499900,
    currencyCode: 'PHP',
    paidAt: '2026-05-14T08:00:00.000Z',
    serviceTypeCode: 'oil-change',
    serviceCategoryCode: 'preventive-maintenance',
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
  triggerName: 'service.payment_recorded',
  sourceDomain: 'main-service.job-orders',
  loyaltyUserId: 'customer-1',
  accrualKind: 'service_payment',
  idempotencyKey: 'loyalty:service.payment_recorded:service-invoice-record-1',
  sourceReference: 'service-invoice-record-1',
  policyKey: 'loyalty.service.payment_recorded.v1',
  pointsInput: {
    mode: 'service_payment',
    invoiceReference: 'SRV-INV-2026-0001',
    amountCents: 499900,
    currencyCode: 'PHP',
    paidAt: '2026-05-14T08:00:00.000Z',
    serviceTypeCode: 'oil-change',
    serviceCategoryCode: 'preventive-maintenance',
  },
  duplicateStrategy: 'ignore_same_idempotency_key',
  reversalStrategy: 'manual_adjustment_until_service_refund_event_exists',
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
    mode: 'ecommerce_payment',
    invoiceReference: 'INV-2026-0002',
    amountCents: 159900,
    currencyCode: 'PHP',
    paidAt: '2026-05-14T09:00:00.000Z',
    productIds: ['product-2'],
    productCategoryIds: ['category-2'],
  },
  duplicateStrategy: 'ignore_same_idempotency_key',
  reversalStrategy: 'manual_adjustment_until_ecommerce_refund_event_exists',
};

export const loyaltyEventMocks = [
  servicePaymentRecordedEventMock,
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
    id: 'loyalty-transaction-1',
    loyaltyAccountId: 'loyalty-account-1',
    transactionType: 'accrual',
    sourceType: 'service_payment',
    sourceReference: 'service-invoice-record-1',
    idempotencyKey: 'loyalty:service.payment_recorded:service-invoice-record-1',
    policyKey: 'loyalty.service.payment_recorded.v1',
    pointsDelta: 131,
    resultingBalance: 131,
    metadata: {
      triggerName: 'service.payment_recorded',
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

export const customerMobileZeroBalanceLoyaltyStateMock = {
  account: {
    id: 'loyalty-account-zero',
    userId: 'customer-zero',
    pointsBalance: 0,
    lifetimePointsEarned: 0,
    lifetimePointsRedeemed: 0,
    lastAccruedAt: null,
    createdAt: '2026-05-20T08:00:00.000Z',
    updatedAt: '2026-05-20T08:00:00.000Z',
  } satisfies LoyaltyAccountResponse,
  transactions: [] as LoyaltyTransactionResponse[],
  rewards: [
    {
      ...activeRewardMock,
      id: 'reward-locked-1',
      name: '10% PMS discount',
      rewardType: 'discount_coupon',
      pointsCost: 150,
      discountPercent: 10,
    },
  ] satisfies RewardResponse[],
};

export const customerMobilePartialHistoryLoyaltyStateMock = {
  account: loyaltyAccountMock,
  transactions: [
    loyaltyTransactionsMock[0],
    rewardRedemptionMock.transaction,
  ] satisfies LoyaltyTransactionResponse[],
  rewards: [activeRewardMock] satisfies RewardResponse[],
};

export const customerMobileEligibleRedemptionStateMock = {
  account: loyaltyAccountMock,
  reward: activeRewardMock,
  redemption: rewardRedemptionMock,
};

export const customerMobileInsufficientPointsStateMock = {
  account: {
    ...loyaltyAccountMock,
    pointsBalance: 40,
    lifetimePointsEarned: 40,
    updatedAt: '2026-05-15T09:00:00.000Z',
  } satisfies LoyaltyAccountResponse,
  reward: {
    ...activeRewardMock,
    id: 'reward-expensive-1',
    pointsCost: 250,
    name: 'Free detailing session',
  } satisfies RewardResponse,
  error: loyaltyInsufficientPointsErrorMock,
};

export const customerMobileInactiveRewardStateMock = {
  account: loyaltyAccountMock,
  reward: inactiveRewardMock,
  error: loyaltyInactiveRewardErrorMock,
};

export const customerMobileLoyaltyForbiddenStateMock = {
  error: loyaltyForbiddenErrorMock,
};

export const customerMobileLoyaltyRuntimeFailureStateMock = {
  statusCode: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'Unable to load loyalty data right now.',
  source: 'runtime',
} as const;

export const customerMobileLegacyLoyaltyDriftStateMock = {
  account: {
    ...loyaltyAccountMock,
    pointsBalance: 162,
    lifetimePointsEarned: 162,
  } satisfies LoyaltyAccountResponse,
  transactions: [
    {
      id: 'loyalty-transaction-legacy-1',
      loyaltyAccountId: 'loyalty-account-1',
      transactionType: 'accrual',
      sourceType: 'purchase_payment',
      sourceReference: 'payment-entry-legacy-1',
      idempotencyKey: 'loyalty:invoice.payment_recorded:payment-entry-legacy-1',
      policyKey: 'loyalty.invoice.payment_recorded.v1',
      pointsDelta: 31,
      resultingBalance: 162,
      metadata: {
        triggerName: 'invoice.payment_recorded',
        sourceDomain: 'ecommerce.invoice-payments',
      },
      createdAt: '2026-05-14T09:00:00.000Z',
    },
  ] satisfies LoyaltyTransactionResponse[],
  note:
    'Legacy ecommerce-linked rows may still exist in backend internals or historical data, but customer-facing loyalty meaning remains service-earned first.',
};
