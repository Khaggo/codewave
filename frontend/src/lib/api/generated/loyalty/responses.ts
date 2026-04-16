import type { InvoicePaymentRecordedEvent } from '../commerce-events/responses';
import type {
  LoyaltySourceType,
  LoyaltyTransactionType,
  RewardStatus,
  RewardType,
} from './requests';

export interface ServiceInvoiceFinalizedEventPayload {
  jobOrderId: string;
  invoiceRecordId: string;
  invoiceReference: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  finalizedByUserId: string;
  sourceType: 'booking' | 'back_job';
  sourceId: string;
}

export interface ServiceInvoiceFinalizedEvent {
  eventId: string;
  name: 'service.invoice_finalized';
  version: 1;
  producer: 'main-service';
  sourceDomain: 'main-service.job-orders';
  occurredAt: string;
  payload: ServiceInvoiceFinalizedEventPayload;
}

export type LoyaltyTriggerEvent =
  | ServiceInvoiceFinalizedEvent
  | InvoicePaymentRecordedEvent;

export interface ServiceInvoiceFactPointsInput {
  mode: 'service_invoice_fact';
  invoiceReference: string;
}

export interface PurchasePaymentPointsInput {
  mode: 'payment_amount';
  amountCents: number;
  currencyCode: 'PHP';
}

export type LoyaltyPointsInput =
  | ServiceInvoiceFactPointsInput
  | PurchasePaymentPointsInput;

export type LoyaltyAccrualKind = 'service_invoice' | 'purchase_payment';
export type LoyaltyDuplicateStrategy = 'ignore_same_idempotency_key';
export type LoyaltyReversalStrategy =
  | 'manual_adjustment_until_service_reversal_event_exists'
  | 'compensating_debit_when_payment_reversal_or_refund_event_arrives';

export interface LoyaltyAccrualPlan {
  triggerName: 'service.invoice_finalized' | 'invoice.payment_recorded';
  sourceDomain: 'main-service.job-orders' | 'ecommerce.invoice-payments';
  loyaltyUserId: string;
  accrualKind: LoyaltyAccrualKind;
  idempotencyKey: string;
  sourceReference: string;
  policyKey:
    | 'loyalty.service.invoice_finalized.v1'
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
