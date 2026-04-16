import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import {
  analyticsRefreshJobs,
  analyticsRefreshJobStatusEnum,
  analyticsRefreshTriggerSourceEnum,
  analyticsSnapshots,
  analyticsSnapshotTypeEnum,
  AnalyticsSnapshotPayload,
  AnalyticsSourceCounts,
} from '../schemas/analytics.schema';

type SnapshotType = (typeof analyticsSnapshotTypeEnum.enumValues)[number];
type RefreshJobStatus = (typeof analyticsRefreshJobStatusEnum.enumValues)[number];
type RefreshTriggerSource = (typeof analyticsRefreshTriggerSourceEnum.enumValues)[number];

type CreateRefreshJobInput = {
  snapshotTypes: SnapshotType[];
  triggerSource: RefreshTriggerSource;
  requestedByUserId?: string | null;
  status?: RefreshJobStatus;
};

type UpsertSnapshotInput = {
  snapshotType: SnapshotType;
  payload: AnalyticsSnapshotPayload;
  sourceCounts: AnalyticsSourceCounts;
  refreshJobId: string;
  version?: string;
};

@Injectable()
export class AnalyticsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async findSnapshotByType(snapshotType: SnapshotType, db: AppDatabase = this.db) {
    return (
      (await db.query.analyticsSnapshots.findFirst({
        where: eq(analyticsSnapshots.snapshotType, snapshotType),
        with: {
          refreshJob: true,
        },
      })) ?? null
    );
  }

  async createRefreshJob(payload: CreateRefreshJobInput, db: AppDatabase = this.db) {
    const [refreshJob] = await db
      .insert(analyticsRefreshJobs)
      .values({
        snapshotTypes: payload.snapshotTypes,
        triggerSource: payload.triggerSource,
        requestedByUserId: payload.requestedByUserId ?? null,
        status: payload.status ?? 'processing',
      })
      .returning();

    return this.assertFound(refreshJob, 'Analytics refresh job not found');
  }

  async markRefreshJobCompleted(id: string, sourceCounts: AnalyticsSourceCounts, db: AppDatabase = this.db) {
    const [refreshJob] = await db
      .update(analyticsRefreshJobs)
      .set({
        status: 'completed',
        sourceCounts,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(analyticsRefreshJobs.id, id))
      .returning();

    return this.assertFound(refreshJob, 'Analytics refresh job not found');
  }

  async markRefreshJobFailed(id: string, errorMessage: string, db: AppDatabase = this.db) {
    const [refreshJob] = await db
      .update(analyticsRefreshJobs)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(analyticsRefreshJobs.id, id))
      .returning();

    return this.assertFound(refreshJob, 'Analytics refresh job not found');
  }

  async upsertSnapshot(payload: UpsertSnapshotInput, db: AppDatabase = this.db) {
    const [snapshot] = await db
      .insert(analyticsSnapshots)
      .values({
        snapshotType: payload.snapshotType,
        version: payload.version ?? 'v1',
        payload: payload.payload,
        sourceCounts: payload.sourceCounts,
        refreshJobId: payload.refreshJobId,
        generatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: analyticsSnapshots.snapshotType,
        set: {
          version: payload.version ?? 'v1',
          payload: payload.payload,
          sourceCounts: payload.sourceCounts,
          refreshJobId: payload.refreshJobId,
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.assertFound(snapshot, 'Analytics snapshot not found');
  }

  async listRefreshJobs(limit = 10) {
    return this.db.query.analyticsRefreshJobs.findMany({
      orderBy: desc(analyticsRefreshJobs.createdAt),
      limit,
    });
  }
}
