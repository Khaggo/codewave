import { createServiceEvent, isServiceEventEnvelope, serviceEventRegistry } from './contracts/service-events';
import { LoyaltyAccrualPlannerService } from './loyalty-accrual-planner.service';
import { ServiceEventReactionPlannerService } from './service-event-reaction-planner.service';

describe('service event and loyalty accrual contracts', () => {
  it('builds a stable service.payment_recorded envelope and service reaction plan', () => {
    const event = createServiceEvent('service.payment_recorded', {
      jobOrderId: 'job-order-1',
      invoiceRecordId: 'invoice-record-1',
      invoiceReference: 'INV-JO-20260514-ABCD1234',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      recordedByUserId: 'cashier-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      amountPaidCents: 125000,
      currencyCode: 'PHP',
      paidAt: '2026-05-14T06:00:00.000Z',
      settlementStatus: 'paid',
      paymentMethod: 'cash',
      serviceTypeCode: 'collision_repair',
      serviceCategoryCode: 'repair',
    });
    const planner = new ServiceEventReactionPlannerService();
    const plan = planner.plan(event);

    expect(isServiceEventEnvelope(event)).toBe(true);
    expect(serviceEventRegistry['service.payment_recorded']).toEqual(
      expect.objectContaining({
        producer: 'main-service',
        sourceDomain: 'main-service.job-orders',
      }),
    );
    expect(plan).toEqual({
      eventId: event.eventId,
      eventName: 'service.payment_recorded',
      sourceDomain: 'main-service.job-orders',
      targets: [
        {
          consumerDomain: 'main-service.loyalty',
          action: 'evaluate_service_accrual',
          reason:
            'Loyalty evaluates a paid service fact only after the service invoice is settled, never from booking or invoice finalization alone.',
        },
        {
          consumerDomain: 'main-service.analytics',
          action: 'record_service_payment_fact',
          reason:
            'Analytics tracks immutable service payment facts without reading operational payment state directly.',
        },
      ],
    });
  });

  it('derives deterministic idempotency keys for service payment loyalty accrual triggers', () => {
    const planner = new LoyaltyAccrualPlannerService();

    const serviceEvent = createServiceEvent(
      'service.payment_recorded',
      {
        jobOrderId: 'job-order-1',
        invoiceRecordId: 'invoice-record-1',
        invoiceReference: 'INV-JO-20260514-ABCD1234',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        recordedByUserId: 'cashier-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        amountPaidCents: 125000,
        currencyCode: 'PHP',
        paidAt: '2026-05-14T06:00:00.000Z',
        settlementStatus: 'paid',
        paymentMethod: 'cash',
        serviceTypeCode: 'collision_repair',
        serviceCategoryCode: 'repair',
      },
      {
        eventId: 'service-event-1',
      },
    );
    const duplicateServiceEvent = {
      ...serviceEvent,
      eventId: 'service-event-2',
    };

    const servicePlan = planner.parseAndPlan(serviceEvent);
    const duplicateServicePlan = planner.parseAndPlan(duplicateServiceEvent);
    const resolvedServicePlan = servicePlan!;
    const resolvedDuplicateServicePlan = duplicateServicePlan!;

    expect(servicePlan).not.toBeNull();
    expect(duplicateServicePlan).not.toBeNull();
    expect(resolvedServicePlan).toEqual(
      expect.objectContaining({
        triggerName: 'service.payment_recorded',
        accrualKind: 'service_payment',
        idempotencyKey: 'loyalty:service.payment_recorded:invoice-record-1',
        duplicateStrategy: 'ignore_same_idempotency_key',
        reversalStrategy: 'manual_adjustment_until_service_refund_event_exists',
      }),
    );
    expect(resolvedDuplicateServicePlan.idempotencyKey).toBe(resolvedServicePlan.idempotencyKey);
  });

  it('accepts only settled service payment triggers', () => {
    const planner = new LoyaltyAccrualPlannerService();

    expect(planner.supportsEventName('service.payment_recorded')).toBe(true);
    expect(planner.supportsEventName('service.invoice_finalized')).toBe(false);
    expect(planner.supportsEventName('booking.created')).toBe(false);
    expect(planner.supportsEventName('booking.confirmed')).toBe(false);
    expect(planner.supportsEventName('order.created')).toBe(false);
  });
});
