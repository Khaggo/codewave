import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';
import { AiWorkerJobMetadata } from '@shared/queue/ai-worker.types';

import {
  jobOrderQualityGates,
  QualityGateAiSummary,
  qualityGateFindings,
  qualityGateFindingGateEnum,
  QualityGateFindingProvenance,
  qualityGateFindingSeverityEnum,
  QualityPreCheckSummary,
  shouldReuseQualityGateAiGeneration,
  qualityGateOverrides,
  qualityGateReviewerVerdictEnum,
  qualityPreCheckStatusEnum,
  qualityGateStatusEnum,
} from '../schemas/quality-gates.schema';

type ClaimAiSummaryInput = {
  evidenceFingerprint: string;
  generationId: string;
  jobId: string;
  requestedAt: string;
  provider: string;
  model: string;
  promptVersion: string;
  provenance: QualityGateAiSummary['provenance'];
  auditJob: AiWorkerJobMetadata;
  regenerate: boolean;
};

type UpdateAiSummaryOptions = {
  evidenceFingerprint?: string;
  generationId?: string;
  jobId?: string;
  requestedAt?: string;
};

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateFindingGate = (typeof qualityGateFindingGateEnum.enumValues)[number];
type QualityGateFindingSeverity = (typeof qualityGateFindingSeverityEnum.enumValues)[number];
type QualityPreCheckStatus = (typeof qualityPreCheckStatusEnum.enumValues)[number];
type QualityGateReviewerVerdict = (typeof qualityGateReviewerVerdictEnum.enumValues)[number];

type CompleteAuditInput = {
  status: QualityGateStatus;
  preCheckStatus: QualityPreCheckStatus;
  preCheckSummary: QualityPreCheckSummary | null;
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
  actorRole: 'technician' | 'head_technician' | 'service_adviser' | 'super_admin';
  reason: string;
};

type RecordReviewerVerdictInput = {
  reviewerUserId: string;
  reviewerVerdict: Exclude<QualityGateReviewerVerdict, 'pending'>;
  reviewerNote?: string | null;
  expectedVersion?: number;
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
          status: 'pending_review',
          preCheckStatus: 'pending',
          preCheckSummary: null,
          reviewerVerdict: 'pending',
          reviewerNote: null,
          reviewedAt: null,
          riskScore: 0,
          blockingReason: null,
          auditJob,
          lastAuditRequestedAt: now,
          lastAuditCompletedAt: null,
          version: sql`${jobOrderQualityGates.version} + 1`,
          updatedAt: now,
        })
        .where(eq(jobOrderQualityGates.id, existing.id));

      return this.findByJobOrderId(jobOrderId);
    }

    const createdRows = await this.db
      .insert(jobOrderQualityGates)
      .values({
        jobOrderId,
        status: 'pending_review',
        preCheckStatus: 'pending',
        preCheckSummary: null,
        reviewerVerdict: 'pending',
        reviewerNote: null,
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
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobOrderQualityGates.id, gate.id));

    return this.findByJobOrderId(jobOrderId);
  }

  async markAiSummaryStaleIfChanged(jobOrderId: string, evidenceFingerprint: string) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    const aiSummary = gate?.preCheckSummary?.aiSummary;
    if (!gate || !aiSummary || aiSummary.evidenceFingerprint === evidenceFingerprint) {
      return gate;
    }

    const preCheckSummary = {
      ...(gate.preCheckSummary ?? {}),
      aiSummary: {
        ...aiSummary,
        status: 'stale' as const,
        summaryText: null,
        errorCode: 'AI_SUMMARY_EVIDENCE_CHANGED',
        errorMessage: 'QA evidence changed. Generate a new advisory summary before the verdict.',
      },
    } as QualityPreCheckSummary;

    await this.db
      .update(jobOrderQualityGates)
      .set({
        preCheckSummary,
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobOrderQualityGates.id, gate.id),
          eq(jobOrderQualityGates.version, gate.version),
        ),
      );

    return this.findByJobOrderId(jobOrderId);
  }

  async claimAiSummaryGeneration(jobOrderId: string, input: ClaimAiSummaryInput) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const current = gate.preCheckSummary?.aiSummary;
    if (shouldReuseQualityGateAiGeneration(current, input.evidenceFingerprint, input.regenerate)) {
      return { claimed: false, gate };
    }

    const aiSummary: QualityGateAiSummary = {
      status: 'queued',
      summaryText: null,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      evidenceFingerprint: input.evidenceFingerprint,
      generationId: input.generationId,
      jobId: input.jobId,
      requestedAt: input.requestedAt,
      generatedAt: null,
      errorCode: null,
      errorMessage: null,
      auditJob: input.auditJob,
      provenance: input.provenance,
    };
    const preCheckSummary = {
      ...(gate.preCheckSummary ?? {}),
      aiSummary,
    } as QualityPreCheckSummary;

    const updated = await this.db
      .update(jobOrderQualityGates)
      .set({
        preCheckSummary,
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobOrderQualityGates.id, gate.id),
          eq(jobOrderQualityGates.version, gate.version),
        ),
      )
      .returning({ id: jobOrderQualityGates.id });

    if (updated.length === 0) {
      return { claimed: false, gate: await this.findByJobOrderId(jobOrderId) };
    }

    return { claimed: true, gate: await this.findByJobOrderId(jobOrderId) };
  }

  async updateAiSummary(
    jobOrderId: string,
    aiSummary: QualityGateAiSummary,
    options: UpdateAiSummaryOptions = {},
  ) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const preCheckSummary = {
      ...(gate.preCheckSummary ?? {}),
      aiSummary,
    } as QualityPreCheckSummary;
    const conditions = [eq(jobOrderQualityGates.id, gate.id)];
    if (options.evidenceFingerprint) {
      conditions.push(
        sql`${jobOrderQualityGates.preCheckSummary}->'aiSummary'->>'evidenceFingerprint' = ${options.evidenceFingerprint}`,
      );
    }
    if (options.generationId) {
      conditions.push(
        sql`${jobOrderQualityGates.preCheckSummary}->'aiSummary'->>'generationId' = ${options.generationId}`,
      );
    }
    if (options.jobId) {
      conditions.push(
        sql`${jobOrderQualityGates.preCheckSummary}->'aiSummary'->>'jobId' = ${options.jobId}`,
      );
    }
    if (options.requestedAt) {
      conditions.push(
        sql`${jobOrderQualityGates.preCheckSummary}->'aiSummary'->>'requestedAt' = ${options.requestedAt}`,
      );
    }

    await this.db
      .update(jobOrderQualityGates)
      .set({
        preCheckSummary,
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(...conditions));

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
        preCheckStatus: payload.preCheckStatus,
        preCheckSummary: payload.preCheckSummary,
        riskScore: payload.riskScore,
        blockingReason: payload.blockingReason ?? null,
        auditJob: payload.auditJob,
        lastAuditCompletedAt: now,
        version: sql`${jobOrderQualityGates.version} + 1`,
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
          reviewerVerdict: 'passed',
          reviewerNote: payload.reason,
          reviewedAt: now,
          version: sql`${jobOrderQualityGates.version} + 1`,
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

  async assignHeadTechnician(jobOrderId: string, headTechnicianUserId: string | null) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    await this.db
      .update(jobOrderQualityGates)
      .set({
        headTechnicianUserId,
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobOrderQualityGates.id, gate.id));

    return this.findByJobOrderId(jobOrderId);
  }

  async recordReviewerVerdict(jobOrderId: string, payload: RecordReviewerVerdictInput) {
    const gate = await this.findOptionalByJobOrderId(jobOrderId);
    if (!gate) {
      throw new NotFoundException('Quality gate not found');
    }

    const updatedRows = await this.db
      .update(jobOrderQualityGates)
      .set({
        status: payload.reviewerVerdict === 'passed' ? 'passed' : 'blocked',
        reviewerVerdict: payload.reviewerVerdict,
        reviewerNote: payload.reviewerNote ?? null,
        reviewedAt: new Date(),
        headTechnicianUserId: payload.reviewerUserId,
        version: sql`${jobOrderQualityGates.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(jobOrderQualityGates.id, gate.id),
        payload.expectedVersion === undefined
          ? sql`true`
          : eq(jobOrderQualityGates.version, payload.expectedVersion),
      ))
      .returning({ id: jobOrderQualityGates.id });

    if (updatedRows.length === 0) {
      throw new ConflictException({
        code: 'STALE_WORK_VERSION',
        message: 'This QA review changed in another session. Refresh before recording a verdict.',
      });
    }

    return this.findByJobOrderId(jobOrderId);
  }
}
