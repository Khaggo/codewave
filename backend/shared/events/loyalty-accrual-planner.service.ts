import { Injectable } from '@nestjs/common';

import {
  AnyCommerceEventEnvelope,
  isCommerceEventEnvelope,
} from './contracts/commerce-events';
import {
  AnyServiceEventEnvelope,
  isServiceEventEnvelope,
} from './contracts/service-events';

type SupportedLoyaltyTriggerName =
  | 'service.invoice_finalized'
  | 'invoice.payment_recorded';

export interface LoyaltyAccrualPlan {
  triggerName: SupportedLoyaltyTriggerName;
  sourceDomain: string;
  loyaltyUserId: string;
  accrualKind: 'service_invoice' | 'purchase_payment';
  idempotencyKey: string;
  sourceReference: string;
  policyKey: string;
  pointsInput:
    | {
        mode: 'service_invoice_fact';
        invoiceReference: string;
      }
    | {
        mode: 'payment_amount';
        amountCents: number;
        currencyCode: 'PHP';
      };
  duplicateStrategy: 'ignore_same_idempotency_key';
  reversalStrategy:
    | 'manual_adjustment_until_service_reversal_event_exists'
    | 'compensating_debit_when_payment_reversal_or_refund_event_arrives';
}

@Injectable()
export class LoyaltyAccrualPlannerService {
  supportsEventName(eventName: string) {
    return ['service.invoice_finalized', 'invoice.payment_recorded'].includes(eventName);
  }

  planFromServiceEvent(event: AnyServiceEventEnvelope): LoyaltyAccrualPlan {
    if (event.name !== 'service.invoice_finalized') {
      throw new Error(`Unsupported service loyalty trigger: ${event.name}`);
    }

    return {
      triggerName: event.name,
      sourceDomain: event.sourceDomain,
      loyaltyUserId: event.payload.customerUserId,
      accrualKind: 'service_invoice',
      idempotencyKey: `loyalty:${event.name}:${event.payload.invoiceRecordId}`,
      sourceReference: event.payload.invoiceRecordId,
      policyKey: 'loyalty.service.invoice_finalized.v1',
      pointsInput: {
        mode: 'service_invoice_fact',
        invoiceReference: event.payload.invoiceReference,
      },
      duplicateStrategy: 'ignore_same_idempotency_key',
      reversalStrategy: 'manual_adjustment_until_service_reversal_event_exists',
    };
  }

  planFromCommerceEvent(event: AnyCommerceEventEnvelope): LoyaltyAccrualPlan {
    if (event.name !== 'invoice.payment_recorded') {
      throw new Error(`Unsupported commerce loyalty trigger: ${event.name}`);
    }

    return {
      triggerName: event.name,
      sourceDomain: event.sourceDomain,
      loyaltyUserId: event.payload.customerUserId,
      accrualKind: 'purchase_payment',
      idempotencyKey: `loyalty:${event.name}:${event.payload.paymentEntryId}`,
      sourceReference: event.payload.paymentEntryId,
      policyKey: 'loyalty.invoice_payment_recorded.v1',
      pointsInput: {
        mode: 'payment_amount',
        amountCents: event.payload.amountCents,
        currencyCode: event.payload.currencyCode,
      },
      duplicateStrategy: 'ignore_same_idempotency_key',
      reversalStrategy: 'compensating_debit_when_payment_reversal_or_refund_event_arrives',
    };
  }

  parseAndPlan(candidate: unknown): LoyaltyAccrualPlan {
    if (isServiceEventEnvelope(candidate)) {
      return this.planFromServiceEvent(candidate);
    }

    if (isCommerceEventEnvelope(candidate)) {
      return this.planFromCommerceEvent(candidate);
    }

    throw new Error('Invalid loyalty accrual event envelope');
  }
}
