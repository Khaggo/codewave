import { randomUUID } from 'crypto';

export const lifecycleEventNames = [
  'job_order.created',
  'job_order.finalized',
  'quality_gate.passed',
  'quality_gate.blocked',
  'quality_gate.overridden',
  'vehicle.lifecycle_summary_reviewed',
] as const;

export type LifecycleEventName = (typeof lifecycleEventNames)[number];
export type LifecycleEventProducer = 'main-service';
export type LifecycleEventSourceDomain =
  | 'main-service.job-orders'
  | 'main-service.quality-gates'
  | 'main-service.vehicle-lifecycle';
export type LifecycleEventConsumerDomain =
  | 'main-service.vehicle-lifecycle'
  | 'main-service.analytics';

export interface JobOrderCreatedEventPayload {
  jobOrderId: string;
  vehicleId: string;
  customerUserId: string;
  sourceType: 'booking' | 'back_job';
  sourceId: string;
  status: 'draft' | 'assigned';
  serviceAdviserUserId: string;
}

export interface JobOrderFinalizedEventPayload {
  jobOrderId: string;
  vehicleId: string;
  invoiceRecordId: string;
  invoiceReference: string;
  finalizedByUserId: string;
}

export interface QualityGatePassedEventPayload {
  qualityGateId: string;
  jobOrderId: string;
  vehicleId: string;
  riskScore: number;
}

export interface QualityGateBlockedEventPayload {
  qualityGateId: string;
  jobOrderId: string;
  vehicleId: string;
  riskScore: number;
  blockingReason: string;
}

export interface QualityGateOverriddenEventPayload {
  qualityGateId: string;
  jobOrderId: string;
  vehicleId: string;
  overrideId: string;
  actorUserId: string;
  actorRole: 'super_admin';
  reason: string;
}

export interface VehicleLifecycleSummaryReviewedEventPayload {
  vehicleId: string;
  summaryId: string;
  status: 'approved' | 'rejected';
  reviewedByUserId: string;
  customerVisible: boolean;
}

export interface LifecycleEventPayloadByName {
  'job_order.created': JobOrderCreatedEventPayload;
  'job_order.finalized': JobOrderFinalizedEventPayload;
  'quality_gate.passed': QualityGatePassedEventPayload;
  'quality_gate.blocked': QualityGateBlockedEventPayload;
  'quality_gate.overridden': QualityGateOverriddenEventPayload;
  'vehicle.lifecycle_summary_reviewed': VehicleLifecycleSummaryReviewedEventPayload;
}

export interface LifecycleEventEnvelope<
  TName extends LifecycleEventName = LifecycleEventName,
  TPayload extends LifecycleEventPayloadByName[TName] = LifecycleEventPayloadByName[TName],
> {
  eventId: string;
  name: TName;
  version: 1;
  producer: LifecycleEventProducer;
  sourceDomain: LifecycleEventSourceDomain;
  occurredAt: string;
  payload: TPayload;
}

export type AnyLifecycleEventEnvelope = {
  [TName in LifecycleEventName]: LifecycleEventEnvelope<TName>;
}[LifecycleEventName];

export const lifecycleEventRegistry: Record<
  LifecycleEventName,
  {
    producer: LifecycleEventProducer;
    sourceDomain: LifecycleEventSourceDomain;
    consumers: readonly LifecycleEventConsumerDomain[];
    description: string;
  }
> = {
  'job_order.created': {
    producer: 'main-service',
    sourceDomain: 'main-service.job-orders',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when a vehicle-linked job order is created from a booking or back-job source.',
  },
  'job_order.finalized': {
    producer: 'main-service',
    sourceDomain: 'main-service.job-orders',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when a job order generates an invoice-ready record and reaches finalized state.',
  },
  'quality_gate.passed': {
    producer: 'main-service',
    sourceDomain: 'main-service.quality-gates',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when a release QA audit completes without blocking findings.',
  },
  'quality_gate.blocked': {
    producer: 'main-service',
    sourceDomain: 'main-service.quality-gates',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when QA blocks release because operational evidence does not clear the vehicle.',
  },
  'quality_gate.overridden': {
    producer: 'main-service',
    sourceDomain: 'main-service.quality-gates',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when a super admin manually overrides a blocked quality gate with an auditable reason.',
  },
  'vehicle.lifecycle_summary_reviewed': {
    producer: 'main-service',
    sourceDomain: 'main-service.vehicle-lifecycle',
    consumers: ['main-service.vehicle-lifecycle', 'main-service.analytics'],
    description: 'Emitted when a lifecycle summary review decision changes customer visibility state.',
  },
};

export function createLifecycleEvent<TName extends LifecycleEventName>(
  name: TName,
  payload: LifecycleEventPayloadByName[TName],
  overrides?: {
    eventId?: string;
    occurredAt?: string;
  },
): LifecycleEventEnvelope<TName> {
  const definition = lifecycleEventRegistry[name];

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

export function isLifecycleEventEnvelope(value: unknown): value is AnyLifecycleEventEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnyLifecycleEventEnvelope>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.version === 'number' &&
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    lifecycleEventNames.includes(candidate.name as LifecycleEventName) &&
    candidate.producer === 'main-service' &&
    typeof candidate.sourceDomain === 'string' &&
    candidate.payload !== null &&
    typeof candidate.payload === 'object'
  );
}

export function getLifecycleEventConsumers(name: LifecycleEventName) {
  return lifecycleEventRegistry[name].consumers;
}
