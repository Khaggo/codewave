import { createCommerceEvent } from './contracts/commerce-events';
import { createServiceEvent, isServiceEventEnvelope, serviceEventRegistry } from './contracts/service-events';
import { LoyaltyAccrualPlannerService } from './loyalty-accrual-planner.service';
import { ServiceEventReactionPlannerService } from './service-event-reaction-planner.service';

describe('service event and loyalty accrual contracts', () => {
  it('builds a stable service.invoice_finalized envelope and service reaction plan', () => {
    const event = createServiceEvent('service.invoice_finalized', {
      jobOrderId: 'job-order-1',
      invoiceRecordId: 'invoice-record-1',
      invoiceReference: 'INV-JO-20260514-ABCD1234',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      finalizedByUserId: 'adviser-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
    });
    const planner = new ServiceEventReactionPlannerService();
    const plan = planner.plan(event);

    expect(isServiceEventEnvelope(event)).toBe(true);
    expect(serviceEventRegistry['service.invoice_finalized']).toEqual(
      expect.objectContaining({
        producer: 'main-service',
        sourceDomain: 'main-service.job-orders',
      }),
    );
    expect(plan).toEqual({
      eventId: event.eventId,
      eventName: 'service.invoice_finalized',
      sourceDomain: 'main-service.job-orders',
      targets: [
        {
          consumerDomain: 'main-service.loyalty',
          action: 'evaluate_service_accrual',
          reason:
            'Loyalty evaluates a completed service fact only after invoice-ready finalization, never from booking creation or confirmation.',
        },
        {
          consumerDomain: 'main-service.analytics',
          action: 'record_service_invoice_fact',
          reason:
            'Analytics tracks immutable service invoice-finalization facts without reading job-order tables directly.',
        },
      ],
    });
  });

  it('derives deterministic idempotency keys for service and purchase loyalty accrual triggers', () => {
    const planner = new LoyaltyAccrualPlannerService();

    const serviceEvent = createServiceEvent(
      'service.invoice_finalized',
      {
        jobOrderId: 'job-order-1',
        invoiceRecordId: 'invoice-record-1',
        invoiceReference: 'INV-JO-20260514-ABCD1234',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        finalizedByUserId: 'adviser-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
      },
      {
        eventId: 'service-event-1',
      },
    );
    const duplicateServiceEvent = {
      ...serviceEvent,
      eventId: 'service-event-2',
    };

    const purchaseEvent = createCommerceEvent(
      'invoice.payment_recorded',
      {
        invoiceId: 'invoice-1',
        orderId: 'order-1',
        customerUserId: 'customer-1',
        invoiceNumber: 'INV-2026-0001',
        paymentEntryId: 'payment-entry-1',
        amountCents: 55000,
        paymentMethod: 'cash',
        receivedAt: '2026-05-14T06:00:00.000Z',
        invoiceStatus: 'partially_paid',
        amountPaidCents: 55000,
        amountDueCents: 25000,
        currencyCode: 'PHP',
      },
      {
        eventId: 'commerce-event-1',
      },
    );
    const duplicatePurchaseEvent = {
      ...purchaseEvent,
      eventId: 'commerce-event-2',
    };

    const servicePlan = planner.parseAndPlan(serviceEvent);
    const duplicateServicePlan = planner.parseAndPlan(duplicateServiceEvent);
    const purchasePlan = planner.parseAndPlan(purchaseEvent);
    const duplicatePurchasePlan = planner.parseAndPlan(duplicatePurchaseEvent);

    expect(servicePlan).toEqual(
      expect.objectContaining({
        triggerName: 'service.invoice_finalized',
        accrualKind: 'service_invoice',
        idempotencyKey: 'loyalty:service.invoice_finalized:invoice-record-1',
        duplicateStrategy: 'ignore_same_idempotency_key',
        reversalStrategy: 'manual_adjustment_until_service_reversal_event_exists',
      }),
    );
    expect(duplicateServicePlan.idempotencyKey).toBe(servicePlan.idempotencyKey);

    expect(purchasePlan).toEqual(
      expect.objectContaining({
        triggerName: 'invoice.payment_recorded',
        accrualKind: 'purchase_payment',
        idempotencyKey: 'loyalty:invoice.payment_recorded:payment-entry-1',
        duplicateStrategy: 'ignore_same_idempotency_key',
        reversalStrategy: 'compensating_debit_when_payment_reversal_or_refund_event_arrives',
      }),
    );
    expect(duplicatePurchasePlan.idempotencyKey).toBe(purchasePlan.idempotencyKey);
  });

  it('only accepts service.invoice_finalized and invoice.payment_recorded as loyalty accrual triggers', () => {
    const planner = new LoyaltyAccrualPlannerService();
    const unsupportedOrderEvent = createCommerceEvent('order.created', {
      orderId: 'order-1',
      orderNumber: 'ORD-2026-0001',
      customerUserId: 'customer-1',
      checkoutMode: 'invoice',
      status: 'invoice_pending',
      subtotalCents: 109900,
      itemCount: 1,
      invoiceId: 'invoice-1',
    });

    expect(planner.supportsEventName('service.invoice_finalized')).toBe(true);
    expect(planner.supportsEventName('invoice.payment_recorded')).toBe(true);
    expect(planner.supportsEventName('booking.created')).toBe(false);
    expect(planner.supportsEventName('booking.confirmed')).toBe(false);
    expect(planner.supportsEventName('order.created')).toBe(false);
    expect(() => planner.parseAndPlan(unsupportedOrderEvent)).toThrow(
      'Unsupported commerce loyalty trigger: order.created',
    );
  });
});
