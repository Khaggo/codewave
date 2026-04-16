import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, desc, eq, inArray } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { AiWorkerJobMetadata } from '@shared/queue/ai-worker.types';

import {
  jobOrderQualityGates,
  qualityGateFindings,
  qualityGateFindingGateEnum,
  QualityGateFindingProvenance,
  qualityGateFindingSeverityEnum,
  qualityGateOverrides,
  qualityGateStatusEnum,
} from '../schemas/quality-gates.schema';

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateFindingGate = (typeof qualityGateFindingGateEnum.enumValues)[number];
type QualityGateFindingSeverity = (typeof qualityGateFindingSeverityEnum.enumValues)[number];

type CompleteAuditInput = {
  status: QualityGateStatus;
  riskScore: number;
  blockingReason?: string | null;
  auditJob: AiWorkerJobMetadata;
  findings: Array<{
    gate: QualityGateFindingGate;
    severity: QualityGateFindingSeverity;
    code: string;
    message: string;
    provenance?: QualityGateFindingProvenance | null;
  }>;
};

type CreateOverrideInput = {
  actorUserId: string;
  actorRole: 'technician' | 'service_adviser' | 'super_admin';
  reason: string;
};

@Injectable()
export class QualityGatesRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async findByJobOrderId(jobOrderId: string) {
    const gate = await this.db.query.jobOrderQualityGates.findFirst({
      where: eq(jobOrderQualityGates.jobOrderId, jobOrderId),
      with: {
        findings: {
          orderBy: asc(qualityGateFindings.createdAt),
        },
        overrides: {
          orderBy: desc(qualityGateOverrides.createdAt),
        },
      },
    });

    return this.assertFound(gate, 'Quality gate not found');
  }

  async findOptionalByJobOrderId(jobOrderId: string) {
    return this.db.query.jobOrderQualityGates.findFirst({
      where: eq(jobOrderQualityGates.jobOrderId, jobOrderId),
      with: {
        findings: {
          orderBy: asc(qualityGateFindings.createdAt),
        },
        overrides: {
          orderBy: desc(qualityGateOverrides.createdAt),
        },
      },
    });
  }

  async findByJobOrderIds(jobOrderIds: string[]) {
    if (jobOrderIds.length === 0) {
      return [];
    }

    return this.db.query.jobOrderQualityGates.findMany({
      where: inArray(jobOrderQualityGates.jobOrderId, jobOrderIds),
      with: {
        findings: {
          orderBy: asc(qualityGateFindings.createdAt),
        },
        overrides: {
          orderBy: desc(qualityGateOverrides.createdAt),
        },
      },
      orderBy: [asc(jobOrderQualityGates.lastAuditRequestedAt), asc(jobOrderQualityGates.createdAt)],
    });
  }

  async upsertPending(jobOrderId: string, auditJob: AiWorkerJobMetadata) {
    const now = new Date();
    const existing = await this.findOptionalByJobOrderId(jobOrderId);

    if (existing) {
      await this.db.delete(qualityGateFindings).where(eq(qualityGateFindings.qualityGateId, existing.id));

      await this.db
        .update(jobOrderQualityGates)
        .set({
          status: 'pending',
          riskScore: 0,
          blockingReason: null,
          auditJob,
          lastAuditRequestedAt: now,
          lastAuditCompletedAt: null,
          updatedAt: now,
        })
        .where(eq(jobOrderQualityGates.id, existing.id));

      return this.findByJobOrderId(jobOrderId);
    }

    const createdRows = await this.db
      .insert(jobOrderQualityGates)
      .values({
        jobOrderId,
        status: 'pending',
        riskScore: 0,
        blockingReason: null,
        auditJob,
        lastAuditRequestedAt: now,
      })
      .returning();

    this.assertFound(createdRows[0], 'Quality gate not found');
    return this.findByJobOrderId(jobOrderId);
  }

  async updateAuditJob(jobOrderId: string, auditJob: AiWorkerJobMetadata, options?: {
    blockingReason?: string | null;
    lastAuditCompletedAt?: Date | null;
  }) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    await this.db
      .update(jobOrderQualityGates)
      .set({
        auditJob,
        blockingReason: options?.blockingReason ?? gate.blockingReason,
        lastAuditCompletedAt: options?.lastAuditCompletedAt ?? gate.lastAuditCompletedAt,
        updatedAt: new Date(),
      })
      .where(eq(jobOrderQualityGates.id, gate.id));

    return this.findByJobOrderId(jobOrderId);
  }

  async completeAudit(jobOrderId: string, payload: CompleteAuditInput) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const now = new Date();

    await this.db.delete(qualityGateFindings).where(eq(qualityGateFindings.qualityGateId, gate.id));

    if (payload.findings.length) {
      await this.db.insert(qualityGateFindings).values(
        payload.findings.map((finding) => ({
          qualityGateId: gate.id,
          gate: finding.gate,
          severity: finding.severity,
          code: finding.code,
          message: finding.message,
          provenance: finding.provenance ?? null,
        })),
      );
    }

    await this.db
      .update(jobOrderQualityGates)
      .set({
        status: payload.status,
        riskScore: payload.riskScore,
        blockingReason: payload.blockingReason ?? null,
        auditJob: payload.auditJob,
        lastAuditCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(jobOrderQualityGates.id, gate.id));

    return this.findByJobOrderId(jobOrderId);
  }

  async createOverride(jobOrderId: string, payload: CreateOverrideInput) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.insert(qualityGateOverrides).values({
        qualityGateId: gate.id,
        actorUserId: payload.actorUserId,
        actorRole: payload.actorRole,
        reason: payload.reason,
      });

      await tx
        .update(jobOrderQualityGates)
        .set({
          status: 'overridden',
          updatedAt: now,
        })
        .where(eq(jobOrderQualityGates.id, gate.id));
    });

    return this.findByJobOrderId(jobOrderId);
  }

  async listOverridesForAnalytics() {
    return this.db.query.qualityGateOverrides.findMany({
      orderBy: desc(qualityGateOverrides.createdAt),
      with: {
        qualityGate: true,
      },
    });
  }
}
