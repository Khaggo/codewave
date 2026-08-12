import { Injectable } from '@nestjs/common';

import {
  AnyServiceEventEnvelope,
  isServiceEventEnvelope,
} from './contracts/service-events';

export interface LoyaltyAccrualPlan {
  triggerName: 'service.payment_recorded';
  sourceDomain: string;
  loyaltyUserId: string;
  vehicleId: string;
  accrualKind: 'service_payment';
  idempotencyKey: string;
  sourceReference: string;
  policyKey: string;
  pointsInput: {
        mode: 'service_payment';
        invoiceReference: string;
        amountCents: number;
        currencyCode: 'PHP';
        paidAt: string;
        serviceTypeCode?: string | null;
        serviceCategoryCode?: string | null;
      };
  duplicateStrategy: 'ignore_same_idempotency_key';
  reversalStrategy: 'manual_adjustment_until_service_refund_event_exists';
}

@Injectable()
export class LoyaltyAccrualPlannerService {
  supportsEventName(eventName: string) {
    return eventName === 'service.payment_recorded';
  }

  planFromServiceEvent(event: AnyServiceEventEnvelope): LoyaltyAccrualPlan {
    if (event.name !== 'service.payment_recorded') {
      throw new Error(`Unsupported service loyalty trigger: ${event.name}`);
    }

    return {
      triggerName: event.name,
      sourceDomain: event.sourceDomain,
      loyaltyUserId: event.payload.customerUserId,
      vehicleId: event.payload.vehicleId,
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

  parseAndPlan(candidate: unknown): LoyaltyAccrualPlan {
    if (isServiceEventEnvelope(candidate)) {
      return this.planFromServiceEvent(candidate);
    }

    throw new Error('Invalid loyalty accrual event envelope');
  }
}
