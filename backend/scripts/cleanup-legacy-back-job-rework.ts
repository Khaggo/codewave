import 'reflect-metadata';

import { and, eq, ne } from 'drizzle-orm';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../apps/main-service/src/app.module';
import { backJobs, jobOrderQualityGates, jobOrders } from '../shared/db/schema';
import { DRIZZLE_DB } from '../shared/db/database.constants';
import type { AppDatabase } from '../shared/db/database.types';

type CleanupArgs = {
  execute: boolean;
  jobOrderId: string | null;
  backJobId: string | null;
};

type EligibleRecord = {
  jobOrderId: string;
  backJobId: string;
  qualityGateId: string | null;
  backJobStatusAfterDelete: 'approved_for_rework' | 'inspected';
  currentBackJobStatus: string;
  currentJobOrderStatus: string;
  returnInspectionStatus: string | null;
  blockingReason: string | null;
  findingCodes: string[];
};

const allowedNonCriticalFindingCodes = new Set([
  'inspection_requires_followup',
  'inspection_history_gap',
  'semantic_resolution_review_needed',
  'semantic_resolution_insufficient_context',
  'semantic_resolution_supported',
]);

function parseArgs(argv: string[]): CleanupArgs {
  let execute = false;
  let jobOrderId: string | null = null;
  let backJobId: string | null = null;

  for (const entry of argv) {
    if (entry === '--execute') {
      execute = true;
      continue;
    }
    if (entry.startsWith('--job-order-id=')) {
      jobOrderId = entry.slice('--job-order-id='.length).trim() || null;
      continue;
    }
    if (entry.startsWith('--back-job-id=')) {
      backJobId = entry.slice('--back-job-id='.length).trim() || null;
    }
  }

  return { execute, jobOrderId, backJobId };
}

function isLegacyInspectionScopeBlocked({
  qualityGate,
  findings,
}: {
  qualityGate: {
    id: string;
    status: string;
    blockingReason: string | null;
  } | null;
  findings: Array<{ code: string; severity: string }>;
}) {
  if (!qualityGate || !['blocked', 'pending_review'].includes(qualityGate.status)) {
    return false;
  }

  const criticalCodes = findings.filter((finding) => finding.severity === 'critical').map((finding) => finding.code);
  if (criticalCodes.length === 0 || criticalCodes.some((code) => code !== 'inspection_requires_followup')) {
    return false;
  }

  const hasUnexpectedFinding = findings.some((finding) => !allowedNonCriticalFindingCodes.has(finding.code));
  if (hasUnexpectedFinding) {
    return false;
  }

  const blockingReason = String(qualityGate.blockingReason ?? '').toLowerCase();
  return blockingReason.includes('needs_followup');
}

async function collectEligibleRecords(db: AppDatabase, args: CleanupArgs) {
  const sourceWhere = [
    eq(jobOrders.sourceType, 'back_job'),
    eq(jobOrders.jobType, 'back_job'),
    ne(jobOrders.status, 'finalized'),
  ];

  if (args.jobOrderId) {
    sourceWhere.push(eq(jobOrders.id, args.jobOrderId));
  }

  const candidates = await db.query.jobOrders.findMany({
    where: and(...sourceWhere),
    with: {
      invoiceRecord: true,
    },
  });

  const eligible: EligibleRecord[] = [];
  const skipped: Array<{ jobOrderId: string; reason: string }> = [];

  for (const candidate of candidates) {
    const linkedBackJob = await db.query.backJobs.findFirst({
      where: and(
        eq(backJobs.id, candidate.sourceId),
        eq(backJobs.reworkJobOrderId, candidate.id),
        ...(args.backJobId ? [eq(backJobs.id, args.backJobId)] : []),
      ),
      with: {
        returnInspection: true,
      },
    });

    if (!linkedBackJob) {
      skipped.push({ jobOrderId: candidate.id, reason: 'linked back-job not found for this rework job order' });
      continue;
    }

    if (candidate.invoiceRecord) {
      skipped.push({ jobOrderId: candidate.id, reason: 'invoice record already exists' });
      continue;
    }

    const qualityGate = await db.query.jobOrderQualityGates.findFirst({
      where: eq(jobOrderQualityGates.jobOrderId, candidate.id),
      with: {
        findings: true,
      },
    });

    if (
      !isLegacyInspectionScopeBlocked({
        qualityGate: qualityGate
          ? {
              id: qualityGate.id,
              status: qualityGate.status,
              blockingReason: qualityGate.blockingReason ?? null,
            }
          : null,
        findings: (qualityGate?.findings ?? []).map((finding) => ({
          code: finding.code,
          severity: finding.severity,
        })),
      })
    ) {
      skipped.push({ jobOrderId: candidate.id, reason: 'quality gate is not blocked solely by the stale inspection path' });
      continue;
    }

    eligible.push({
      jobOrderId: candidate.id,
      backJobId: linkedBackJob.id,
      qualityGateId: qualityGate?.id ?? null,
      backJobStatusAfterDelete: linkedBackJob.returnInspection?.status === 'completed' ? 'approved_for_rework' : 'inspected',
      currentBackJobStatus: linkedBackJob.status,
      currentJobOrderStatus: candidate.status,
      returnInspectionStatus: linkedBackJob.returnInspection?.status ?? null,
      blockingReason: qualityGate?.blockingReason ?? null,
      findingCodes: (qualityGate?.findings ?? []).map((finding) => finding.code),
    });
  }

  return { eligible, skipped };
}

async function executeCleanup(db: AppDatabase, eligible: EligibleRecord[]) {
  const deleted: EligibleRecord[] = [];

  for (const entry of eligible) {
    await db.transaction(async (tx) => {
      await tx.delete(jobOrders).where(eq(jobOrders.id, entry.jobOrderId));
      await tx
        .update(backJobs)
        .set({
          reworkJobOrderId: null,
          status: entry.backJobStatusAfterDelete,
          updatedAt: new Date(),
        })
        .where(eq(backJobs.id, entry.backJobId));
    });

    deleted.push(entry);
  }

  return deleted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const db = app.get<AppDatabase>(DRIZZLE_DB);
    const { eligible, skipped } = await collectEligibleRecords(db, args);
    const deleted = args.execute ? await executeCleanup(db, eligible) : [];

    console.log(
      JSON.stringify(
        {
          mode: args.execute ? 'execute' : 'dry_run',
          filters: {
            jobOrderId: args.jobOrderId,
            backJobId: args.backJobId,
          },
          eligibleCount: eligible.length,
          skippedCount: skipped.length,
          eligible,
          skipped,
          deletedCount: deleted.length,
          deleted,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
