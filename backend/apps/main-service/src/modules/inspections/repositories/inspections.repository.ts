import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { inspectionFindings, vehicleInspections } from '../schemas/inspections.schema';

@Injectable()
export class InspectionsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(vehicleId: string, payload: CreateInspectionDto) {
    return this.db.transaction(async (tx) => {
      const [inspection] = await tx
        .insert(vehicleInspections)
        .values({
          vehicleId,
          bookingId: payload.bookingId ?? null,
          inspectionType: payload.inspectionType,
          status: payload.status ?? 'completed',
          inspectorUserId: payload.inspectorUserId ?? null,
          notes: payload.notes ?? null,
          attachmentRefs: payload.attachmentRefs ?? [],
        })
        .returning();

      if (payload.findings?.length) {
        await tx.insert(inspectionFindings).values(
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

      return this.findById(inspection.id, tx);
    });
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const inspection = await db.query.vehicleInspections.findFirst({
      where: eq(vehicleInspections.id, id),
      with: {
        findings: {
          orderBy: desc(inspectionFindings.createdAt),
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
      },
      orderBy: desc(vehicleInspections.createdAt),
    });
  }
}
