import { Injectable } from '@nestjs/common';

import {
  AnyCommerceEventEnvelope,
  CommerceEventConsumerDomain,
  CommerceEventName,
  getCommerceEventConsumers,
  isCommerceEventEnvelope,
} from './contracts/commerce-events';

export interface CommerceEventReactionTarget {
  consumerDomain: CommerceEventConsumerDomain;
  action: string;
  reason: string;
}

export interface CommerceEventReactionPlan {
  eventId: string;
  eventName: CommerceEventName;
  sourceDomain: AnyCommerceEventEnvelope['sourceDomain'];
  targets: CommerceEventReactionTarget[];
}

@Injectable()
export class CommerceEventReactionPlannerService {
  plan(event: AnyCommerceEventEnvelope): CommerceEventReactionPlan {
    return {
      eventId: event.eventId,
      eventName: event.name,
      sourceDomain: event.sourceDomain,
      targets: getCommerceEventConsumers(event.name).map((consumerDomain) => ({
        consumerDomain,
        action: this.getAction(event.name, consumerDomain),
        reason: this.getReason(event.name, consumerDomain),
      })),
    };
  }

  parseAndPlan(candidate: unknown) {
    if (!isCommerceEventEnvelope(candidate)) {
      throw new Error('Invalid commerce event envelope');
    }

    return this.plan(candidate);
  }

  private getAction(eventName: CommerceEventName, consumerDomain: CommerceEventConsumerDomain) {
    if (eventName === 'order.created' && consumerDomain === 'main-service.analytics') {
      return 'record_order_created_fact';
    }

    if (eventName === 'order.invoice_issued' && consumerDomain === 'main-service.notifications') {
      return 'schedule_invoice_reminder_policy';
    }

    if (eventName === 'order.invoice_issued' && consumerDomain === 'main-service.analytics') {
      return 'record_invoice_issued_fact';
    }

    if (eventName === 'invoice.payment_recorded' && consumerDomain === 'main-service.notifications') {
      return 'refresh_invoice_notification_state';
    }

    if (eventName === 'invoice.payment_recorded' && consumerDomain === 'main-service.loyalty') {
      return 'evaluate_purchase_accrual';
    }

    return 'record_commerce_event_fact';
  }

  private getReason(eventName: CommerceEventName, consumerDomain: CommerceEventConsumerDomain) {
    if (eventName === 'order.created' && consumerDomain === 'main-service.analytics') {
      return 'Analytics keeps a cross-service order fact without reading ecommerce tables directly.';
    }

    if (eventName === 'order.invoice_issued' && consumerDomain === 'main-service.notifications') {
      return 'Notifications uses the issued invoice fact to schedule email reminders and aging notices.';
    }

    if (eventName === 'order.invoice_issued' && consumerDomain === 'main-service.analytics') {
      return 'Analytics tracks invoice issuance without inferring state from synchronous reads.';
    }

    if (eventName === 'invoice.payment_recorded' && consumerDomain === 'main-service.notifications') {
      return 'Notifications can stop or adjust invoice-aging reminders after payment facts arrive.';
    }

    if (eventName === 'invoice.payment_recorded' && consumerDomain === 'main-service.loyalty') {
      return 'Loyalty reacts to recorded payment facts for purchase-based accrual without owning invoice state.';
    }

    return 'Consumer tracks the stable commerce fact without taking ownership from ecommerce-service.';
  }
}
