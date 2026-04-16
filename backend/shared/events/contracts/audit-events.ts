import { randomUUID } from 'crypto';

export const auditEventNames = [
  'staff_account.provisioned',
  'staff_account.status_changed',
] as const;

export type AuditEventName = (typeof auditEventNames)[number];
export type AuditEventProducer = 'main-service';
export type AuditEventSourceDomain = 'main-service.auth' | 'main-service.quality-gates';
export type AuditEventConsumerDomain = 'main-service.analytics';

export interface StaffAccountProvisionedEventPayload {
  auditLogId: string;
  actorUserId: string;
  actorRole: 'super_admin';
  targetUserId: string;
  targetRole: 'technician' | 'service_adviser' | 'super_admin';
  targetEmail: string;
  targetStaffCode: string | null;
  reason: string | null;
}

export interface StaffAccountStatusChangedEventPayload {
  auditLogId: string;
  actorUserId: string;
  actorRole: 'super_admin';
  targetUserId: string;
  targetRole: 'technician' | 'service_adviser' | 'super_admin';
  targetEmail: string;
  targetStaffCode: string | null;
  previousIsActive: boolean;
  nextIsActive: boolean;
  reason: string | null;
}

export interface AuditEventPayloadByName {
  'staff_account.provisioned': StaffAccountProvisionedEventPayload;
  'staff_account.status_changed': StaffAccountStatusChangedEventPayload;
}

export interface AuditEventEnvelope<
  TName extends AuditEventName = AuditEventName,
  TPayload extends AuditEventPayloadByName[TName] = AuditEventPayloadByName[TName],
> {
  eventId: string;
  name: TName;
  version: 1;
  producer: AuditEventProducer;
  sourceDomain: AuditEventSourceDomain;
  occurredAt: string;
  payload: TPayload;
}

export type AnyAuditEventEnvelope = {
  [TName in AuditEventName]: AuditEventEnvelope<TName>;
}[AuditEventName];

export const auditEventRegistry: Record<
  AuditEventName,
  {
    producer: AuditEventProducer;
    sourceDomain: AuditEventSourceDomain;
    consumers: readonly AuditEventConsumerDomain[];
    description: string;
  }
> = {
  'staff_account.provisioned': {
    producer: 'main-service',
    sourceDomain: 'main-service.auth',
    consumers: ['main-service.analytics'],
    description:
      'Emitted after a super admin provisions a pending staff account so audit consumers can trace who created the identity.',
  },
  'staff_account.status_changed': {
    producer: 'main-service',
    sourceDomain: 'main-service.auth',
    consumers: ['main-service.analytics'],
    description:
      'Emitted after a super admin activates or deactivates a staff account, preserving the actor and reason metadata.',
  },
};

export function createAuditEvent<TName extends AuditEventName>(
  name: TName,
  payload: AuditEventPayloadByName[TName],
  overrides?: {
    eventId?: string;
    occurredAt?: string;
  },
): AuditEventEnvelope<TName> {
  const definition = auditEventRegistry[name];

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

export function isAuditEventEnvelope(value: unknown): value is AnyAuditEventEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AnyAuditEventEnvelope>;
  return (
    typeof candidate.eventId === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.version === 'number' &&
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    auditEventNames.includes(candidate.name as AuditEventName) &&
    candidate.producer === 'main-service' &&
    typeof candidate.sourceDomain === 'string' &&
    candidate.payload !== null &&
    typeof candidate.payload === 'object'
  );
}

export function getAuditEventConsumers(name: AuditEventName) {
  return auditEventRegistry[name].consumers;
}
