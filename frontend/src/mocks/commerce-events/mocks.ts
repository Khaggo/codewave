import type {
  InvoicePaymentRecordedEvent,
  OrderCreatedEvent,
  OrderInvoiceIssuedEvent,
} from '../../lib/api/generated/commerce-events/responses';

export const orderCreatedEventMock: OrderCreatedEvent = {
  eventId: 'event-order-created-1',
  name: 'order.created',
  version: 1,
  producer: 'ecommerce-service',
  sourceDomain: 'ecommerce.orders',
  occurredAt: '2026-05-14T05:00:00.000Z',
  payload: {
    orderId: 'order-1',
    orderNumber: 'ORD-2026-0001',
    customerUserId: 'customer-1',
    checkoutMode: 'invoice',
    status: 'invoice_pending',
    subtotalCents: 99800,
    itemCount: 2,
    invoiceId: 'invoice-1',
  },
};

export const orderInvoiceIssuedEventMock: OrderInvoiceIssuedEvent = {
  eventId: 'event-order-invoice-issued-1',
  name: 'order.invoice_issued',
  version: 1,
  producer: 'ecommerce-service',
  sourceDomain: 'ecommerce.orders',
  occurredAt: '2026-05-14T05:00:02.000Z',
  payload: {
    orderId: 'order-1',
    orderNumber: 'ORD-2026-0001',
    invoiceId: 'invoice-1',
    invoiceNumber: 'INV-2026-0001',
    customerUserId: 'customer-1',
    totalCents: 99800,
    amountDueCents: 99800,
    currencyCode: 'PHP',
    dueAt: '2026-05-21T05:00:02.000Z',
  },
};

export const invoicePaymentRecordedEventMock: InvoicePaymentRecordedEvent = {
  eventId: 'event-invoice-payment-recorded-1',
  name: 'invoice.payment_recorded',
  version: 1,
  producer: 'ecommerce-service',
  sourceDomain: 'ecommerce.invoice-payments',
  occurredAt: '2026-05-14T06:00:00.000Z',
  payload: {
    invoiceId: 'invoice-1',
    orderId: 'order-1',
    customerUserId: 'customer-1',
    invoiceNumber: 'INV-2026-0001',
    paymentEntryId: 'payment-entry-1',
    amountCents: 99800,
    paymentMethod: 'cash',
    receivedAt: '2026-05-14T06:00:00.000Z',
    invoiceStatus: 'paid',
    amountPaidCents: 99800,
    amountDueCents: 0,
    currencyCode: 'PHP',
  },
};

export const commerceEventMocks = [
  orderCreatedEventMock,
  orderInvoiceIssuedEventMock,
  invoicePaymentRecordedEventMock,
];
