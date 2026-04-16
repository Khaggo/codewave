import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import {
  AnyAuditEventEnvelope,
  AuditEventEnvelope,
  AuditEventName,
  AuditEventPayloadByName,
  auditEventNames,
  createAuditEvent,
} from './contracts/audit-events';
import {
  AnyCommerceEventEnvelope,
  CommerceEventEnvelope,
  CommerceEventName,
  CommerceEventPayloadByName,
  commerceEventNames,
  createCommerceEvent,
} from './contracts/commerce-events';
import {
  AnyServiceEventEnvelope,
  createServiceEvent,
  ServiceEventEnvelope,
  ServiceEventName,
  ServiceEventPayloadByName,
} from './contracts/service-events';
import {
  AnyLifecycleEventEnvelope,
  createLifecycleEvent,
  LifecycleEventEnvelope,
  LifecycleEventName,
  LifecycleEventPayloadByName,
  lifecycleEventNames,
} from './contracts/lifecycle-events';
import { AUTOCARE_EVENTS_CLIENT } from './events.constants';

@Injectable()
export class AutocareEventBusService {
  private readonly logger = new Logger(AutocareEventBusService.name);
  private readonly publishedEvents: Array<
    AnyAuditEventEnvelope | AnyCommerceEventEnvelope | AnyLifecycleEventEnvelope | AnyServiceEventEnvelope
  > = [];

  constructor(
    @Optional()
    @Inject(AUTOCARE_EVENTS_CLIENT)
    private readonly client?: ClientProxy,
  ) {}

  publish<TName extends AuditEventName>(
    name: TName,
    payload: AuditEventPayloadByName[TName],
  ): AuditEventEnvelope<TName>;
  publish<TName extends CommerceEventName>(
    name: TName,
    payload: CommerceEventPayloadByName[TName],
  ): CommerceEventEnvelope<TName>;
  publish<TName extends LifecycleEventName>(
    name: TName,
    payload: LifecycleEventPayloadByName[TName],
  ): LifecycleEventEnvelope<TName>;
  publish<TName extends ServiceEventName>(
    name: TName,
    payload: ServiceEventPayloadByName[TName],
  ): ServiceEventEnvelope<TName>;
  publish(
    name: AuditEventName | CommerceEventName | LifecycleEventName | ServiceEventName,
    payload:
      | AuditEventPayloadByName[AuditEventName]
      | CommerceEventPayloadByName[CommerceEventName]
      | LifecycleEventPayloadByName[LifecycleEventName]
      | ServiceEventPayloadByName[ServiceEventName],
  ) {
    if (auditEventNames.includes(name as AuditEventName)) {
      const event = createAuditEvent(
        name as AuditEventName,
        payload as AuditEventPayloadByName[AuditEventName],
      );
      return this.publishEnvelope(event);
    }

    if (commerceEventNames.includes(name as CommerceEventName)) {
      const event = createCommerceEvent(
        name as CommerceEventName,
        payload as CommerceEventPayloadByName[CommerceEventName],
      );
      return this.publishEnvelope(event);
    }

    if (lifecycleEventNames.includes(name as LifecycleEventName)) {
      const event = createLifecycleEvent(
        name as LifecycleEventName,
        payload as LifecycleEventPayloadByName[LifecycleEventName],
      );
      return this.publishEnvelope(event);
    }

    const event = createServiceEvent(
      name as ServiceEventName,
      payload as ServiceEventPayloadByName[ServiceEventName],
    );
    return this.publishEnvelope(event);
  }

  publishEnvelope<TName extends AuditEventName>(event: AuditEventEnvelope<TName>): AuditEventEnvelope<TName>;
  publishEnvelope<TName extends CommerceEventName>(event: CommerceEventEnvelope<TName>): CommerceEventEnvelope<TName>;
  publishEnvelope<TName extends LifecycleEventName>(event: LifecycleEventEnvelope<TName>): LifecycleEventEnvelope<TName>;
  publishEnvelope<TName extends ServiceEventName>(event: ServiceEventEnvelope<TName>): ServiceEventEnvelope<TName>;
  publishEnvelope(
    event: AnyAuditEventEnvelope | AnyCommerceEventEnvelope | AnyLifecycleEventEnvelope | AnyServiceEventEnvelope,
  ) {
    this.publishedEvents.push(
      this.clone(
        event as
          | AnyAuditEventEnvelope
          | AnyCommerceEventEnvelope
          | AnyLifecycleEventEnvelope
          | AnyServiceEventEnvelope,
      ),
    );

    if (this.client) {
      void firstValueFrom(this.client.emit(event.name, event)).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown RabbitMQ publish failure';
        this.logger.warn(`Failed to publish ${event.name}: ${message}`);
      });
    }

    return event;
  }

  listPublishedEvents() {
    return this.publishedEvents.map((event) => this.clone(event));
  }

  clearPublishedEvents() {
    this.publishedEvents.length = 0;
  }

  private clone<
    TEvent extends
      | AnyAuditEventEnvelope
      | AnyCommerceEventEnvelope
      | AnyLifecycleEventEnvelope
      | AnyServiceEventEnvelope,
  >(
    event: TEvent,
  ): TEvent {
    return JSON.parse(JSON.stringify(event)) as TEvent;
  }
}
