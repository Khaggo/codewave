import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { AiWorkerJobMetadata } from '@shared/queue/ai-worker.types';

import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import {
  vehicleLifecycleSummaries,
  VehicleLifecycleSummaryProvenance,
  vehicleTimelineEvents,
  vehicleLifecycleSummaryStatusEnum,
} from '../schemas/vehicle-lifecycle.schema';

type VehicleLifecycleSummaryStatus = (typeof vehicleLifecycleSummaryStatusEnum.enumValues)[number];

type CreateVehicleLifecycleSummaryInput = {
  vehicleId: string;
  requestedByUserId: string;
  summaryText: string;
  status?: VehicleLifecycleSummaryStatus;
  generationJob: AiWorkerJobMetadata;
  provenance: VehicleLifecycleSummaryProvenance;
};

type ReviewVehicleLifecycleSummaryInput = {
  status: Extract<VehicleLifecycleSummaryStatus, 'approved' | 'rejected'>;
  reviewNotes?: string | null;
  reviewedByUserId: string;
  reviewedAt: Date;
  customerVisible: boolean;
  customerVisibleAt?: Date | null;
};

type CompleteVehicleLifecycleSummaryGenerationInput = {
  summaryText: string;
  provenance: VehicleLifecycleSummaryProvenance;
  generationJob: AiWorkerJobMetadata;
};

type FailVehicleLifecycleSummaryGenerationInput = {
  summaryText: string;
  generationJob: AiWorkerJobMetadata;
};

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

  async createSummary(payload: CreateVehicleLifecycleSummaryInput) {
    const [createdSummary] = await this.db
      .insert(vehicleLifecycleSummaries)
      .values({
        vehicleId: payload.vehicleId,
        requestedByUserId: payload.requestedByUserId,
        summaryText: payload.summaryText,
        status: payload.status ?? 'queued',
        generationJob: payload.generationJob,
        provenance: payload.provenance,
      })
      .returning();

    return this.findSummaryById(this.assertFound(createdSummary, 'Vehicle lifecycle summary not found').id);
  }

  async findSummaryById(summaryId: string, db: AppDatabase = this.db) {
    const summary = await db.query.vehicleLifecycleSummaries.findFirst({
      where: eq(vehicleLifecycleSummaries.id, summaryId),
    });

    return this.assertFound(summary, 'Vehicle lifecycle summary not found');
  }

  async listSummariesByVehicleId(vehicleId: string, db: AppDatabase = this.db) {
    return db.query.vehicleLifecycleSummaries.findMany({
      where: eq(vehicleLifecycleSummaries.vehicleId, vehicleId),
      orderBy: [desc(vehicleLifecycleSummaries.createdAt), desc(vehicleLifecycleSummaries.id)],
    });
  }

  async updateSummaryGenerationJob(summaryId: string, generationJob: AiWorkerJobMetadata, status?: VehicleLifecycleSummaryStatus) {
    const [updatedSummary] = await this.db
      .update(vehicleLifecycleSummaries)
      .set({
        generationJob,
        ...(status ? { status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(vehicleLifecycleSummaries.id, summaryId))
      .returning();

    return this.findSummaryById(
      this.assertFound(updatedSummary, 'Vehicle lifecycle summary not found').id,
    );
  }

  async completeSummaryGeneration(summaryId: string, payload: CompleteVehicleLifecycleSummaryGenerationInput) {
    const [updatedSummary] = await this.db
      .update(vehicleLifecycleSummaries)
      .set({
        summaryText: payload.summaryText,
        provenance: payload.provenance,
        generationJob: payload.generationJob,
        status: 'pending_review',
        updatedAt: new Date(),
      })
      .where(eq(vehicleLifecycleSummaries.id, summaryId))
      .returning();

    return this.findSummaryById(
      this.assertFound(updatedSummary, 'Vehicle lifecycle summary not found').id,
    );
  }

  async failSummaryGeneration(summaryId: string, payload: FailVehicleLifecycleSummaryGenerationInput) {
    const [updatedSummary] = await this.db
      .update(vehicleLifecycleSummaries)
      .set({
        summaryText: payload.summaryText,
        generationJob: payload.generationJob,
        status: 'generation_failed',
        updatedAt: new Date(),
      })
      .where(eq(vehicleLifecycleSummaries.id, summaryId))
      .returning();

    return this.findSummaryById(
      this.assertFound(updatedSummary, 'Vehicle lifecycle summary not found').id,
    );
  }

  async reviewSummary(summaryId: string, payload: ReviewVehicleLifecycleSummaryInput) {
    const [updatedSummary] = await this.db
      .update(vehicleLifecycleSummaries)
      .set({
        status: payload.status,
        reviewNotes: payload.reviewNotes ?? null,
        reviewedByUserId: payload.reviewedByUserId,
        reviewedAt: payload.reviewedAt,
        customerVisible: payload.customerVisible,
        customerVisibleAt: payload.customerVisibleAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(vehicleLifecycleSummaries.id, summaryId))
      .returning();

    return this.findSummaryById(
      this.assertFound(updatedSummary, 'Vehicle lifecycle summary not found').id,
    );
  }
}
