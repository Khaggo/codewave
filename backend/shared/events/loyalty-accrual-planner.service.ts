import { Injectable } from '@nestjs/common';

import {
  AnyCommerceEventEnvelope,
  isCommerceEventEnvelope,
} from './contracts/commerce-events';
import {
  AnyServiceEventEnvelope,
  isServiceEventEnvelope,
} from './contracts/service-events';

type SupportedLoyaltyTriggerName = 'service.payment_recorded' | 'invoice.payment_recorded';

export interface LoyaltyAccrualPlan {
  triggerName: SupportedLoyaltyTriggerName;
  sourceDomain: string;
  loyaltyUserId: string;
  accrualKind: 'service_payment' | 'purchase_payment';
  idempotencyKey: string;
  sourceReference: string;
  policyKey: string;
  pointsInput:
    | {
        mode: 'service_payment';
        invoiceReference: string;
        amountCents: number;
        currencyCode: 'PHP';
        paidAt: string;
        serviceTypeCode?: string | null;
        serviceCategoryCode?: string | null;
      }
    | {
        mode: 'ecommerce_payment';
        invoiceReference: string;
        amountCents: number;
        currencyCode: 'PHP';
        paidAt: string;
        productIds: string[];
        productCategoryIds: string[];
      };
  duplicateStrategy: 'ignore_same_idempotency_key';
  reversalStrategy:
    | 'manual_adjustment_until_service_refund_event_exists'
    | 'manual_adjustment_until_ecommerce_refund_event_exists';
}

@Injectable()
export class LoyaltyAccrualPlannerService {
  supportsEventName(eventName: string) {
    return ['service.payment_recorded', 'invoice.payment_recorded'].includes(eventName);
  }

  planFromServiceEvent(event: AnyServiceEventEnvelope): LoyaltyAccrualPlan {
    if (event.name !== 'service.payment_recorded') {
      throw new Error(`Unsupported service loyalty trigger: ${event.name}`);
    }

    return {
      triggerName: event.name,
      sourceDomain: event.sourceDomain,
      loyaltyUserId: event.payload.customerUserId,
      accrualKind: 'service_payment',
      idempotencyKey: `loyalty:${event.name}:${event.payload.invoiceRecordId}`,
      sourceReference: event.payload.invoiceRecordId,
      policyKey: 'loyalty.service.payment_recorded.v1',
      pointsInput: {
        mode: 'service_payment',
        invoiceReference: event.payload.invoiceReference,
        amountCents: event.payload.amountPaidCents,
        currencyCode: event.payload.currencyCode,
        paidAt: event.payload.paidAt,
        serviceTypeCode: event.payload.serviceTypeCode ?? null,
        serviceCategoryCode: event.payload.serviceCategoryCode ?? null,
      },
      duplicateStrategy: 'ignore_same_idempotency_key',
      reversalStrategy: 'manual_adjustment_until_service_refund_event_exists',
    };
  }

  planFromCommerceEvent(event: AnyCommerceEventEnvelope): LoyaltyAccrualPlan | null {
    if (event.name !== 'invoice.payment_recorded') {
      throw new Error(`Unsupported commerce loyalty trigger: ${event.name}`);
    }

    if (event.payload.invoiceStatus !== 'paid') {
      return null;
    }

    return {
      triggerName: event.name,
      sourceDomain: event.sourceDomain,
      loyaltyUserId: event.payload.customerUserId,
      accrualKind: 'purchase_payment',
      idempotencyKey: `loyalty:${event.name}:${event.payload.invoiceId}`,
      sourceReference: event.payload.invoiceId,
      policyKey: 'loyalty.invoice.payment_recorded.v1',
      pointsInput: {
        mode: 'ecommerce_payment',
        invoiceReference: event.payload.invoiceNumber,
        amountCents: event.payload.amountPaidCents,
        currencyCode: event.payload.currencyCode,
        paidAt: event.payload.receivedAt,
        productIds: event.payload.productIds ?? [],
        productCategoryIds: event.payload.productCategoryIds ?? [],
      },
      duplicateStrategy: 'ignore_same_idempotency_key',
      reversalStrategy: 'manual_adjustment_until_ecommerce_refund_event_exists',
    };
  }

  parseAndPlan(candidate: unknown): LoyaltyAccrualPlan | null {
    if (isServiceEventEnvelope(candidate)) {
      return this.planFromServiceEvent(candidate);
    }

    if (isCommerceEventEnvelope(candidate)) {
      return this.planFromCommerceEvent(candidate);
    }

    throw new Error('Invalid loyalty accrual event envelope');
  }
}
