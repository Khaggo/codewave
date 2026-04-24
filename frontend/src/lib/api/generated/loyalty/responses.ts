import type { InvoicePaymentRecordedEvent } from '../commerce-events/responses';
import type {
  EarningRuleAccrualSource,
  EarningRuleFormulaType,
  EarningRuleStatus,
  LoyaltySourceType,
  LoyaltyTransactionType,
  RewardStatus,
  RewardType,
} from './requests';

export interface ServicePaymentRecordedEventPayload {
  invoiceRecordId: string;
  invoiceReference: string;
  customerUserId: string;
  amountPaidCents: number;
  currencyCode: 'PHP';
  paidAt: string;
  serviceTypeCode?: string | null;
  serviceCategoryCode?: string | null;
}

export interface ServicePaymentRecordedEvent {
  eventId: string;
  name: 'service.payment_recorded';
  version: 1;
  producer: 'main-service';
  sourceDomain: 'main-service.job-orders';
  occurredAt: string;
  payload: ServicePaymentRecordedEventPayload;
}

export type LoyaltyTriggerEvent =
  | ServicePaymentRecordedEvent
  | InvoicePaymentRecordedEvent;

export interface ServicePaymentPointsInput {
  mode: 'service_payment';
  invoiceReference: string;
  amountCents: number;
  currencyCode: 'PHP';
  paidAt: string;
  serviceTypeCode?: string | null;
  serviceCategoryCode?: string | null;
}

export interface PurchasePaymentPointsInput {
  mode: 'ecommerce_payment';
  invoiceReference: string;
  amountCents: number;
  currencyCode: 'PHP';
  paidAt: string;
  productIds: string[];
  productCategoryIds: string[];
}

export type LoyaltyPointsInput =
  | ServicePaymentPointsInput
  | PurchasePaymentPointsInput;

export type LoyaltyAccrualKind = 'service_payment' | 'purchase_payment';
export type LoyaltyDuplicateStrategy = 'ignore_same_idempotency_key';
export type LoyaltyReversalStrategy =
  | 'manual_adjustment_until_service_refund_event_exists'
  | 'manual_adjustment_until_ecommerce_refund_event_exists';

export interface LoyaltyAccrualPlan {
  triggerName: 'service.payment_recorded' | 'invoice.payment_recorded';
  sourceDomain: 'main-service.job-orders' | 'ecommerce.invoice-payments';
  loyaltyUserId: string;
  accrualKind: LoyaltyAccrualKind;
  idempotencyKey: string;
  sourceReference: string;
  policyKey:
    | 'loyalty.service.payment_recorded.v1'
    | 'loyalty.invoice.payment_recorded.v1';
  pointsInput: LoyaltyPointsInput;
  duplicateStrategy: LoyaltyDuplicateStrategy;
  reversalStrategy: LoyaltyReversalStrategy;
}

export interface LoyaltyAccountResponse {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  lastAccruedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransactionResponse {
  id: string;
  loyaltyAccountId: string;
  transactionType: LoyaltyTransactionType;
  sourceType: LoyaltySourceType;
  sourceReference: string;
  idempotencyKey?: string | null;
  policyKey?: string | null;
  pointsDelta: number;
  resultingBalance: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RewardCatalogSnapshotResponse {
  name: string;
  description?: string | null;
  rewardType: RewardType;
  pointsCost: number;
  discountPercent?: number | null;
  status: RewardStatus;
}

export interface RewardAuditResponse {
  id: string;
  rewardId: string;
  actorUserId: string;
  action: 'created' | 'updated' | 'activated' | 'deactivated';
  reason?: string | null;
  snapshot: RewardCatalogSnapshotResponse;
  createdAt: string;
}

export interface RewardResponse {
  id: string;
  name: string;
  description?: string | null;
  rewardType: RewardType;
  pointsCost: number;
  discountPercent?: number | null;
  status: RewardStatus;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  audits?: RewardAuditResponse[];
}

export interface RewardRedemptionResponse {
  id: string;
  loyaltyAccountId: string;
  userId: string;
  rewardId: string;
  rewardNameSnapshot: string;
  pointsCostSnapshot: number;
  redeemedByUserId: string;
  note?: string | null;
  pointsBalanceAfter: number;
  transaction: LoyaltyTransactionResponse;
  createdAt: string;
}

export interface EarningRuleCatalogSnapshotResponse {
  name: string;
  description?: string | null;
  accrualSource: EarningRuleAccrualSource;
  formulaType: EarningRuleFormulaType;
  flatPoints?: number | null;
  amountStepCents?: number | null;
  pointsPerStep?: number | null;
  minimumAmountCents?: number | null;
  eligibleServiceTypes: string[];
  eligibleServiceCategories: string[];
  eligibleProductIds: string[];
  eligibleProductCategoryIds: string[];
  promoLabel?: string | null;
  manualBenefitNote?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  status: EarningRuleStatus;
}

export interface EarningRuleAuditResponse {
  id: string;
  earningRuleId: string;
  actorUserId: string;
  action: 'created' | 'updated' | 'activated' | 'deactivated';
  reason?: string | null;
  snapshot: EarningRuleCatalogSnapshotResponse;
  createdAt: string;
}

export interface EarningRuleResponse {
  id: string;
  name: string;
  description?: string | null;
  accrualSource: EarningRuleAccrualSource;
  formulaType: EarningRuleFormulaType;
  flatPoints?: number | null;
  amountStepCents?: number | null;
  pointsPerStep?: number | null;
  minimumAmountCents?: number | null;
  eligibleServiceTypes: string[];
  eligibleServiceCategories: string[];
  eligibleProductIds: string[];
  eligibleProductCategoryIds: string[];
  promoLabel?: string | null;
  manualBenefitNote?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  status: EarningRuleStatus;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  audits?: EarningRuleAuditResponse[];
}
