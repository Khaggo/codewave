import { CommerceEventReactionPlannerService } from './commerce-event-reaction-planner.service';
import { createCommerceEvent, commerceEventRegistry, isCommerceEventEnvelope } from './contracts/commerce-events';

describe('commerce event contracts', () => {
  it('builds stable ecommerce event envelopes and reaction plans for the first commerce facts', () => {
    const event = createCommerceEvent('invoice.payment_recorded', {
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
    });
    const planner = new CommerceEventReactionPlannerService();
    const plan = planner.plan(event);

    expect(isCommerceEventEnvelope(event)).toBe(true);
    expect(commerceEventRegistry['invoice.payment_recorded']).toEqual(
      expect.objectContaining({
        producer: 'ecommerce-service',
        sourceDomain: 'ecommerce.invoice-payments',
      }),
    );
    expect(plan).toEqual({
      eventId: event.eventId,
      eventName: 'invoice.payment_recorded',
      sourceDomain: 'ecommerce.invoice-payments',
      targets: [
        {
          consumerDomain: 'main-service.loyalty',
          action: 'evaluate_ecommerce_accrual_if_settled',
          reason:
            'Loyalty evaluates ecommerce invoice payments only when the invoice reaches a paid or settled state, never from order creation, invoice issuance, or partial payment alone.',
        },
        {
          consumerDomain: 'main-service.notifications',
          action: 'refresh_invoice_notification_state',
          reason:
            'Notifications can stop or adjust invoice-aging reminders after payment facts arrive.',
        },
        {
          consumerDomain: 'main-service.analytics',
          action: 'record_commerce_event_fact',
          reason:
            'Consumer tracks the stable commerce fact without taking ownership from ecommerce-service.',
        },
      ],
    });
  });
});
