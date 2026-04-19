import { randomUUID } from 'crypto';

export const commerceEventNames = [
  'order.created',
  'order.invoice_issued',
  'invoice.payment_recorded',
] as const;

export type CommerceEventName = (typeof commerceEventNames)[number];
export type CommerceEventProducer = 'ecommerce-service';
export type CommerceEventSourceDomain = 'ecommerce.orders' | 'ecommerce.invoice-payments';
export type CommerceEventConsumerDomain =
  | 'main-service.loyalty'
  | 'main-service.notifications'
  | 'main-service.analytics';

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
  productIds?: string[];
  productCategoryIds?: string[];
}

export interface CommerceEventPayloadByName {
  'order.created': OrderCreatedEventPayload;
  'order.invoice_issued': OrderInvoiceIssuedEventPayload;
  'invoice.payment_recorded': InvoicePaymentRecordedEventPayload;
}

export interface CommerceEventEnvelope<
  TName extends CommerceEventName = CommerceEventName,
  TPayload extends CommerceEventPayloadByName[TName] = CommerceEventPayloadByName[TName],
> {
  eventId: string;
  name: TName;
  version: 1;
  producer: CommerceEventProducer;
  sourceDomain: CommerceEventSourceDomain;
  occurredAt: string;
  payload: TPayload;
}

export type AnyCommerceEventEnvelope = {
  [TName in CommerceEventName]: CommerceEventEnvelope<TName>;
}[CommerceEventName];

export const commerceEventRegistry: Record<
  CommerceEventName,
  {
    producer: CommerceEventProducer;
    sourceDomain: CommerceEventSourceDomain;
    consumers: readonly CommerceEventConsumerDomain[];
    description: string;
  }
> = {
  'order.created': {
    producer: 'ecommerce-service',
    sourceDomain: 'ecommerce.orders',
    consumers: ['main-service.analytics'],
    description: 'Emitted when an ecommerce invoice checkout creates one immutable order record.',
  },
  'order.invoice_issued': {
    producer: 'ecommerce-service',
    sourceDomain: 'ecommerce.orders',
    consumers: ['main-service.notifications', 'main-service.analytics'],
    description: 'Emitted when an ecommerce order receives its tracked invoice record.',
  },
  'invoice.payment_recorded': {
    producer: 'ecommerce-service',
    sourceDomain: 'ecommerce.invoice-payments',
    consumers: ['main-service.loyalty', 'main-service.notifications', 'main-service.analytics'],
    description:
      'Emitted when a manual invoice payment entry is recorded and balances are recalculated for downstream settlement-aware consumers.',
  },
};

export function createCommerceEvent<TName extends CommerceEventName>(
  name: TName,
  payload: CommerceEventPayloadByName[TName],
  overrides?: {
    eventId?: string;
    occurredAt?: string;
  },
): CommerceEventEnvelope<TName> {
  const definition = commerceEventRegistry[name];

  return {
    eventId: overrides?.eventId ?? randomUUID(),
    name,
    version: 1,
    producer: definition.producer,
    sourceDomain: definition.sourceDomain,
    occurredAt: overrides?.occurredAt ?? new Date().toISOString(),
    payload,
  };
}

export function isCommerceEventEnvelope(value: unknown): value is AnyCommerceEventEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnyCommerceEventEnvelope>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.version === 'number' &&
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    commerceEventNames.includes(candidate.name as CommerceEventName) &&
    candidate.producer === 'ecommerce-service' &&
    typeof candidate.sourceDomain === 'string' &&
    candidate.payload !== null &&
    typeof candidate.payload === 'object'
  );
}

export function getCommerceEventConsumers(name: CommerceEventName) {
  return commerceEventRegistry[name].consumers;
}
