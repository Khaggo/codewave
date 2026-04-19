import { Injectable } from '@nestjs/common';

import {
  AnyServiceEventEnvelope,
  getServiceEventConsumers,
  isServiceEventEnvelope,
  ServiceEventConsumerDomain,
  ServiceEventName,
} from './contracts/service-events';

export interface ServiceEventReactionTarget {
  consumerDomain: ServiceEventConsumerDomain;
  action: string;
  reason: string;
}

export interface ServiceEventReactionPlan {
  eventId: string;
  eventName: ServiceEventName;
  sourceDomain: AnyServiceEventEnvelope['sourceDomain'];
  targets: ServiceEventReactionTarget[];
}

@Injectable()
export class ServiceEventReactionPlannerService {
  plan(event: AnyServiceEventEnvelope): ServiceEventReactionPlan {
    return {
      eventId: event.eventId,
      eventName: event.name,
      sourceDomain: event.sourceDomain,
      targets: getServiceEventConsumers(event.name).map((consumerDomain) => ({
        consumerDomain,
        action: this.getAction(event.name, consumerDomain),
        reason: this.getReason(event.name, consumerDomain),
      })),
    };
  }

  parseAndPlan(candidate: unknown) {
    if (!isServiceEventEnvelope(candidate)) {
      throw new Error('Invalid service event envelope');
    }

    return this.plan(candidate);
  }

  private getAction(eventName: ServiceEventName, consumerDomain: ServiceEventConsumerDomain) {
    if (eventName === 'service.payment_recorded' && consumerDomain === 'main-service.loyalty') {
      return 'evaluate_service_accrual';
    }

    if (eventName === 'service.payment_recorded') {
      return 'record_service_payment_fact';
    }

    return 'record_service_invoice_fact';
  }

  private getReason(eventName: ServiceEventName, consumerDomain: ServiceEventConsumerDomain) {
    if (eventName === 'service.payment_recorded' && consumerDomain === 'main-service.loyalty') {
      return 'Loyalty evaluates a paid service fact only after the service invoice is settled, never from booking, ecommerce checkout, or invoice finalization alone.';
    }

    if (eventName === 'service.payment_recorded') {
      return 'Analytics tracks immutable service payment facts without reading operational payment state directly.';
    }

    return 'Analytics tracks immutable service invoice-finalization facts without reading job-order tables directly.';
  }
}
