import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import { vehicleTimelineEvents } from '../schemas/vehicle-lifecycle.schema';

@Injectable()
export class VehicleLifecycleRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async replaceForVehicle(vehicleId: string, events: AppendVehicleTimelineEventDto[]) {
    return this.db.transaction(async (tx) => {
      await tx.delete(vehicleTimelineEvents).where(eq(vehicleTimelineEvents.vehicleId, vehicleId));

      if (events.length > 0) {
        await tx.insert(vehicleTimelineEvents).values(
          events.map((event) => ({
            vehicleId: event.vehicleId,
            eventType: event.eventType,
            eventCategory: event.eventCategory,
            sourceType: event.sourceType,
            sourceId: event.sourceId,
            occurredAt: event.occurredAt,
            verified: event.verified,
            inspectionId: event.inspectionId ?? null,
            actorUserId: event.actorUserId ?? null,
            notes: event.notes ?? null,
            dedupeKey: event.dedupeKey,
          })),
        );
      }

      return this.findByVehicleId(vehicleId, tx);
    });
  }

  async create(event: AppendVehicleTimelineEventDto) {
    const [createdEvent] = await this.db
      .insert(vehicleTimelineEvents)
      .values({
        vehicleId: event.vehicleId,
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        occurredAt: event.occurredAt,
        verified: event.verified,
        inspectionId: event.inspectionId ?? null,
        actorUserId: event.actorUserId ?? null,
        notes: event.notes ?? null,
        dedupeKey: event.dedupeKey,
      })
      .returning();

    return this.assertFound(createdEvent, 'Vehicle timeline event not found');
  }

  async findByVehicleId(vehicleId: string, db: AppDatabase = this.db) {
    return db.query.vehicleTimelineEvents.findMany({
      where: eq(vehicleTimelineEvents.vehicleId, vehicleId),
      orderBy: [asc(vehicleTimelineEvents.occurredAt), asc(vehicleTimelineEvents.dedupeKey)],
    });
  }
}
