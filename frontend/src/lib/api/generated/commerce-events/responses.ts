export type CommerceEventName =
  | 'order.created'
  | 'order.invoice_issued'
  | 'invoice.payment_recorded';

export interface CommerceEventEnvelope<TName extends CommerceEventName, TPayload> {
  eventId: string;
  name: TName;
  version: 1;
  producer: 'ecommerce-service';
  sourceDomain: 'ecommerce.orders' | 'ecommerce.invoice-payments';
  occurredAt: string;
  payload: TPayload;
}

export interface OrderCreatedEventPayload {
  orderId: string;
  orderNumber: string;
  customerUserId: string;
  checkoutMode: 'invoice';
  status: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';
  subtotalCents: number;
  itemCount: number;
  invoiceId: string | null;
}

export interface OrderInvoiceIssuedEventPayload {
  orderId: string;
  orderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerUserId: string;
  totalCents: number;
  amountDueCents: number;
  currencyCode: 'PHP';
  dueAt: string;
}

export interface InvoicePaymentRecordedEventPayload {
  invoiceId: string;
  orderId: string;
  customerUserId: string;
  invoiceNumber: string;
  paymentEntryId: string;
  amountCents: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other';
  receivedAt: string;
  invoiceStatus: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  amountPaidCents: number;
  amountDueCents: number;
  currencyCode: 'PHP';
}

export type OrderCreatedEvent = CommerceEventEnvelope<'order.created', OrderCreatedEventPayload>;
export type OrderInvoiceIssuedEvent = CommerceEventEnvelope<
  'order.invoice_issued',
  OrderInvoiceIssuedEventPayload
>;
export type InvoicePaymentRecordedEvent = CommerceEventEnvelope<
  'invoice.payment_recorded',
  InvoicePaymentRecordedEventPayload
>;

export type AnyCommerceEvent =
  | OrderCreatedEvent
  | OrderInvoiceIssuedEvent
  | InvoicePaymentRecordedEvent;
