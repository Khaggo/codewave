import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase, AppDatabaseExecutor } from '@shared/db/database.types';

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { SaveIntakeInspectionDraftDto } from '../dto/intake-inspection.dto';
import {
  inspectionEvidence,
  inspectionFindings,
  vehicleInspections,
} from '../schemas/inspections.schema';

@Injectable()
export class InspectionsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async withTransaction<T>(work: (tx: AppDatabaseExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx));
  }

  async create(
    vehicleId: string,
    payload: CreateInspectionDto,
    actorUserId?: string,
    db?: AppDatabaseExecutor,
    completedAt = new Date(),
  ) {
    if (!db) {
      return this.withTransaction((tx) =>
        this.createWithExecutor(vehicleId, payload, actorUserId, tx, completedAt),
      );
    }
    return this.createWithExecutor(vehicleId, payload, actorUserId, db, completedAt);
  }

  private async createWithExecutor(
    vehicleId: string,
    payload: CreateInspectionDto,
    actorUserId: string | undefined,
    db: AppDatabaseExecutor,
    completedAt: Date,
  ) {
      const [inspection] = await db
        .insert(vehicleInspections)
        .values({
          vehicleId,
          bookingId: payload.bookingId ?? null,
          inspectionType: payload.inspectionType,
          status: payload.status ?? 'completed',
          inspectorUserId: actorUserId ?? payload.inspectorUserId ?? null,
          notes: payload.notes ?? null,
          attachmentRefs: payload.attachmentRefs ?? [],
          intakeDataVersion: payload.intakeDataVersion ?? null,
          intakeData: payload.intakeData as unknown as Record<string, unknown> | undefined,
          completedAt: (payload.status ?? 'completed') === 'completed' ? completedAt : null,
        })
        .returning();

      if (payload.findings?.length) {
        await db.insert(inspectionFindings).values(
          payload.findings.map((finding) => ({
            inspectionId: inspection.id,
            category: finding.category,
            label: finding.label,
            severity: finding.severity ?? 'info',
            notes: finding.notes ?? null,
            isVerified: finding.isVerified ?? false,
          })),
        );
      }

      return this.findById(inspection.id, db);
  }

  async findById(id: string, db: AppDatabaseExecutor = this.db) {
    const inspection = await db.query.vehicleInspections.findFirst({
      where: eq(vehicleInspections.id, id),
      with: {
        findings: {
          orderBy: desc(inspectionFindings.createdAt),
        },
        evidence: {
          orderBy: desc(inspectionEvidence.createdAt),
        },
      },
    });

    return this.assertFound(inspection, 'Inspection not found');
  }

  async findByVehicleId(vehicleId: string) {
    return this.db.query.vehicleInspections.findMany({
      where: eq(vehicleInspections.vehicleId, vehicleId),
      with: {
        findings: {
          orderBy: desc(inspectionFindings.createdAt),
        },
        evidence: {
          orderBy: desc(inspectionEvidence.createdAt),
        },
      },
      orderBy: desc(vehicleInspections.createdAt),
    });
  }

  async createIntakeDraft(
    vehicleId: string,
    payload: SaveIntakeInspectionDraftDto,
    actorUserId: string,
  ) {
    const [created] = await this.db
      .insert(vehicleInspections)
      .values({
        vehicleId,
        bookingId: payload.bookingId ?? null,
        inspectionType: 'intake',
        status: 'pending',
        inspectorUserId: actorUserId,
        notes: payload.notes?.trim() || null,
        intakeDataVersion: 1,
        intakeData: payload.intakeData as unknown as Record<string, unknown>,
      })
      .returning();

    return this.findById(created.id);
  }

  async updateIntakeDraft(
    inspectionId: string,
    expectedVersion: number,
    payload: SaveIntakeInspectionDraftDto,
    actorUserId: string,
  ) {
    const [updated] = await this.db
      .update(vehicleInspections)
      .set({
        bookingId: payload.bookingId ?? null,
        inspectorUserId: actorUserId,
        notes: payload.notes?.trim() || null,
        intakeDataVersion: 1,
        intakeData: payload.intakeData as unknown as Record<string, unknown>,
        version: sql`${vehicleInspections.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vehicleInspections.id, inspectionId),
          eq(vehicleInspections.inspectionType, 'intake'),
          eq(vehicleInspections.status, 'pending'),
          eq(vehicleInspections.version, expectedVersion),
        ),
      )
      .returning();

    return updated ? this.findById(updated.id) : null;
  }

  async completeIntakeDraft(
    inspectionId: string,
    expectedVersion: number,
    actorUserId: string,
    completedAt: Date,
    db: AppDatabaseExecutor = this.db,
  ) {
    const [updated] = await db
      .update(vehicleInspections)
      .set({
        status: 'completed',
        inspectorUserId: actorUserId,
        completedAt,
        version: sql`${vehicleInspections.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vehicleInspections.id, inspectionId),
          eq(vehicleInspections.inspectionType, 'intake'),
          eq(vehicleInspections.status, 'pending'),
          eq(vehicleInspections.version, expectedVersion),
        ),
      )
      .returning();

    return updated ? this.findById(updated.id, db) : null;
  }

  async findHistoryPage(payload: {
    vehicleId: string;
    limit: number;
    status?: string;
    cursor?: { createdAt: Date; id: string };
  }) {
    const conditions = [eq(vehicleInspections.vehicleId, payload.vehicleId)];
    if (payload.status) {
      conditions.push(
        eq(
          vehicleInspections.status,
          payload.status as (typeof vehicleInspections.status.enumValues)[number],
        ),
      );
    }
    if (payload.cursor) {
      conditions.push(
        or(
          lt(vehicleInspections.createdAt, payload.cursor.createdAt),
          and(
            eq(vehicleInspections.createdAt, payload.cursor.createdAt),
            lt(vehicleInspections.id, payload.cursor.id),
          ),
        )!,
      );
    }

    return this.db.query.vehicleInspections.findMany({
      where: and(...conditions),
      with: {
        findings: { orderBy: desc(inspectionFindings.createdAt) },
        evidence: { orderBy: desc(inspectionEvidence.createdAt) },
      },
      orderBy: [desc(vehicleInspections.createdAt), desc(vehicleInspections.id)],
      limit: payload.limit + 1,
    });
  }

  async findPendingIntakeByBookingId(bookingId: string) {
    return this.db.query.vehicleInspections.findFirst({
      where: and(
        eq(vehicleInspections.bookingId, bookingId),
        eq(vehicleInspections.inspectionType, 'intake'),
        eq(vehicleInspections.status, 'pending'),
      ),
      with: {
        findings: { orderBy: desc(inspectionFindings.createdAt) },
        evidence: { orderBy: desc(inspectionEvidence.createdAt) },
      },
      orderBy: [desc(vehicleInspections.updatedAt), desc(vehicleInspections.id)],
    });
  }

  async createEvidence(payload: {
    inspectionId: string;
    slot: string;
    originalName: string;
    mimeType: string;
    byteSize: number;
    storageKey: string;
    createdByUserId: string;
  }) {
    const [created] = await this.db.insert(inspectionEvidence).values(payload).returning();
    return created;
  }

  async findEvidence(inspectionId: string, evidenceId: string) {
    return this.db.query.inspectionEvidence.findFirst({
      where: and(
        eq(inspectionEvidence.id, evidenceId),
        eq(inspectionEvidence.inspectionId, inspectionId),
      ),
    });
  }
}
