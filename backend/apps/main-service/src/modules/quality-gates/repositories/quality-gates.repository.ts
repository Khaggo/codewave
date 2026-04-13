import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import {
  jobOrderQualityGates,
  qualityGateFindings,
  qualityGateFindingGateEnum,
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
  findings: Array<{
    gate: QualityGateFindingGate;
    severity: QualityGateFindingSeverity;
    code: string;
    message: string;
  }>;
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

  async upsertPending(jobOrderId: string) {
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
        lastAuditRequestedAt: now,
      })
      .returning();

    this.assertFound(createdRows[0], 'Quality gate not found');
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
        })),
      );
    }

    await this.db
      .update(jobOrderQualityGates)
      .set({
        status: payload.status,
        riskScore: payload.riskScore,
        blockingReason: payload.blockingReason ?? null,
        lastAuditCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(jobOrderQualityGates.id, gate.id));

    return this.findByJobOrderId(jobOrderId);
  }
}
