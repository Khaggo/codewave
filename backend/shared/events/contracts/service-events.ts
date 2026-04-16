import { randomUUID } from 'crypto';

export const serviceEventNames = [
  'service.invoice_finalized',
] as const;

export type ServiceEventName = (typeof serviceEventNames)[number];
export type ServiceEventProducer = 'main-service';
export type ServiceEventSourceDomain = 'main-service.job-orders';
export type ServiceEventConsumerDomain =
  | 'main-service.loyalty'
  | 'main-service.analytics';

export interface ServiceInvoiceFinalizedEventPayload {
  jobOrderId: string;
  invoiceRecordId: string;
  invoiceReference: string;
  customerUserId: string;
  vehicleId: string;
  serviceAdviserUserId: string;
  serviceAdviserCode: string;
  finalizedByUserId: string;
  sourceType: 'booking' | 'back_job';
  sourceId: string;
}

export interface ServiceEventPayloadByName {
  'service.invoice_finalized': ServiceInvoiceFinalizedEventPayload;
}

export interface ServiceEventEnvelope<
  TName extends ServiceEventName = ServiceEventName,
  TPayload extends ServiceEventPayloadByName[TName] = ServiceEventPayloadByName[TName],
> {
  eventId: string;
  name: TName;
  version: 1;
  producer: ServiceEventProducer;
  sourceDomain: ServiceEventSourceDomain;
  occurredAt: string;
  payload: TPayload;
}

export type AnyServiceEventEnvelope = {
  [TName in ServiceEventName]: ServiceEventEnvelope<TName>;
}[ServiceEventName];

export const serviceEventRegistry: Record<
  ServiceEventName,
  {
    producer: ServiceEventProducer;
    sourceDomain: ServiceEventSourceDomain;
    consumers: readonly ServiceEventConsumerDomain[];
    description: string;
  }
> = {
  'service.invoice_finalized': {
    producer: 'main-service',
    sourceDomain: 'main-service.job-orders',
    consumers: ['main-service.loyalty', 'main-service.analytics'],
    description:
      'Emitted when a ready-for-QA job order clears release and creates an immutable invoice-ready service record.',
  },
};

export function createServiceEvent<TName extends ServiceEventName>(
  name: TName,
  payload: ServiceEventPayloadByName[TName],
  overrides?: {
    eventId?: string;
    occurredAt?: string;
  },
): ServiceEventEnvelope<TName> {
  const definition = serviceEventRegistry[name];

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

export function isServiceEventEnvelope(value: unknown): value is AnyServiceEventEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnyServiceEventEnvelope>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.version === 'number' &&
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    serviceEventNames.includes(candidate.name as ServiceEventName) &&
    candidate.producer === 'main-service' &&
    typeof candidate.sourceDomain === 'string' &&
    candidate.payload !== null &&
    typeof candidate.payload === 'object'
  );
}

export function getServiceEventConsumers(name: ServiceEventName) {
  return serviceEventRegistry[name].consumers;
}
