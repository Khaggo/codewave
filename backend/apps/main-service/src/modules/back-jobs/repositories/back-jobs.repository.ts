import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateBackJobDto } from '../dto/create-back-job.dto';
import { UpdateBackJobStatusDto } from '../dto/update-back-job-status.dto';
import { backJobFindings, backJobs } from '../schemas/back-jobs.schema';

type CreateBackJobPersistenceInput = CreateBackJobDto & {
  createdByUserId: string;
};

type UpdateBackJobStatusPersistenceInput = UpdateBackJobStatusDto;

@Injectable()
export class BackJobsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(payload: CreateBackJobPersistenceInput) {
    return this.db.transaction(async (tx) => {
      const [createdBackJob] = await tx
        .insert(backJobs)
        .values({
          customerUserId: payload.customerUserId,
          vehicleId: payload.vehicleId,
          originalBookingId: payload.originalBookingId ?? null,
          originalJobOrderId: payload.originalJobOrderId,
          returnInspectionId: payload.returnInspectionId ?? null,
          complaint: payload.complaint,
          status: 'reported',
          reviewNotes: payload.reviewNotes ?? null,
          createdByUserId: payload.createdByUserId,
        })
        .returning();

      if (payload.findings?.length) {
        await tx.insert(backJobFindings).values(
          payload.findings.map((finding) => ({
            backJobId: createdBackJob.id,
            category: finding.category,
            label: finding.label,
            severity: finding.severity ?? 'info',
            notes: finding.notes ?? null,
            isValidated: finding.isValidated ?? false,
          })),
        );
      }

      return this.findById(createdBackJob.id, tx);
    });
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const backJob = await db.query.backJobs.findFirst({
      where: eq(backJobs.id, id),
      with: {
        findings: {
          orderBy: desc(backJobFindings.createdAt),
        },
      },
    });

    return this.assertFound(backJob, 'Back job not found');
  }

  async findOptionalById(id: string) {
    return this.db.query.backJobs.findFirst({
      where: eq(backJobs.id, id),
      with: {
        findings: {
          orderBy: desc(backJobFindings.createdAt),
        },
      },
    });
  }

  async findByVehicleId(vehicleId: string) {
    return this.db.query.backJobs.findMany({
      where: eq(backJobs.vehicleId, vehicleId),
      with: {
        findings: {
          orderBy: desc(backJobFindings.createdAt),
        },
      },
      orderBy: desc(backJobs.createdAt),
    });
  }

  async listForAnalytics() {
    return this.db.query.backJobs.findMany({
      with: {
        findings: {
          orderBy: desc(backJobFindings.createdAt),
        },
      },
      orderBy: [desc(backJobs.createdAt), desc(backJobs.id)],
    });
  }

  async updateStatus(id: string, payload: UpdateBackJobStatusPersistenceInput) {
    const nextValues: Partial<typeof backJobs.$inferInsert> = {
      status: payload.status,
      updatedAt: new Date(),
    };

    if (payload.returnInspectionId !== undefined) {
      nextValues.returnInspectionId = payload.returnInspectionId;
    }

    if (payload.reviewNotes !== undefined) {
      nextValues.reviewNotes = payload.reviewNotes;
    }

    if (payload.resolutionNotes !== undefined) {
      nextValues.resolutionNotes = payload.resolutionNotes;
    }

    const [updatedBackJob] = await this.db
      .update(backJobs)
      .set(nextValues)
      .where(eq(backJobs.id, id))
      .returning();

    this.assertFound(updatedBackJob, 'Back job not found');
    return this.findById(id);
  }

  async linkReworkJobOrder(id: string, reworkJobOrderId: string) {
    const [updatedBackJob] = await this.db
      .update(backJobs)
      .set({
        reworkJobOrderId,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(backJobs.id, id))
      .returning();

    this.assertFound(updatedBackJob, 'Back job not found');
    return this.findById(id);
  }
}
