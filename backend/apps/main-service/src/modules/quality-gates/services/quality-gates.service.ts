import { createHash } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { StaffWorkQueuesService } from '@main-modules/staff-work-queues/services/staff-work-queues.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import {
  AI_WORKER_QUEUE_NAME,
  DEFAULT_AI_WORKER_JOB_ATTEMPTS,
  DEFAULT_AI_WORKER_JOB_BACKOFF_MS,
  GENERATE_QUALITY_GATE_PRECHECK_SUMMARY_JOB_NAME,
  RUN_QUALITY_GATE_AUDIT_JOB_NAME,
} from '@shared/queue/ai-worker.constants';
import { AiWorkerJobMetadata, createQueuedAiJobMetadata } from '@shared/queue/ai-worker.types';
import { toBullSafeJobId } from '@shared/queue/queue-job-id.util';

import { QualityGatesRepository } from '../repositories/quality-gates.repository';
import {
  QualityGateAiSummary,
  QualityGateFindingProvenance,
  matchesQualityGateAiGeneration,
  qualityGateStatusEnum,
} from '../schemas/quality-gates.schema';
import { OverrideQualityGateDto } from '../dto/override-quality-gate.dto';
import { RecordQualityGateVerdictDto } from '../dto/record-quality-gate-verdict.dto';
import {
  QualityGateDiscrepancyEngineService,
} from './quality-gate-discrepancy-engine.service';
import {
  QualityGateSemanticAuditorService,
} from './quality-gate-semantic-auditor.service';
import { LifecycleSummaryEvidence } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.types';
import { VehicleLifecycleSummaryProviderService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';
import { AI_SUMMARY_UNAVAILABLE_CODE } from '@main-modules/vehicle-lifecycle/services/ai-summary-config';

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateActorRole = 'service_adviser' | 'super_admin';
type QualityGateActor = {
  userId: string;
  role: string;
};
type QualityGateFinding = {
  gate: 'foundation' | 'gate_1' | 'gate_2';
  severity: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
  provenance?: QualityGateFindingProvenance | null;
};

type QualityGateEvidenceRecord = Record<string, unknown>;

export type CanonicalQualityGateAiEvidence = {
  schemaVersion: 'qa-precheck-evidence.v1';
  evidenceTimestamp: string;
  services: Array<{
    category: string;
    status: 'completed' | 'incomplete';
  }>;
  checklist: {
    completedCount: number;
    totalCount: number;
  };
  requiredEvidence: {
    photoCount: number;
    state: 'present' | 'missing';
  };
  progress: {
    entryCount: number;
    state: 'recorded' | 'missing';
  };
  approvedIntakeFindings: string[];
  deterministicFindings: Array<{
    category: string;
    gate: 'foundation' | 'gate_1' | 'gate_2' | 'other';
    severity: 'info' | 'warning' | 'critical' | 'other';
  }>;
  evidenceGapCount: number;
  automatedRecommendation: 'ready_for_review' | 'manual_review_required' | 'unknown';
};

const asEvidenceRecords = (value: unknown): QualityGateEvidenceRecord[] =>
  Array.isArray(value)
    ? value.filter((item): item is QualityGateEvidenceRecord => Boolean(item) && typeof item === 'object')
    : [];

const asEvidenceDate = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const TECHNICAL_VALUE_PATTERNS = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b[0-9a-f]{24,}\b/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}(?:\.[A-Za-z0-9_-]{4,})?\b/,
  /\b[A-Za-z0-9_-]{32,}\b/,
  /\b(?:token|secret|hash|uuid|guid|api[_ -]?key|actor[_ -]?id|user[_ -]?id|internal[_ -]?id)\b/i,
];

const canonicalDisplayText = (value: unknown, fallback: string) => {
  const label = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  if (
    !label ||
    !/[a-z]/i.test(label) ||
    !/^[a-z0-9][a-z0-9 &()+.,-]*$/i.test(label) ||
    TECHNICAL_VALUE_PATTERNS.some((pattern) => pattern.test(label))
  ) {
    return fallback;
  }
  return label;
};

const FINDING_CATEGORY_BY_CODE: Record<string, string> = {
  incomplete_work_items: 'Incomplete work items',
  missing_progress_evidence: 'Missing progress evidence',
  qa_audit_queue_unavailable: 'QA pre-check unavailable',
  qa_audit_worker_failed: 'QA pre-check unavailable',
  missing_completion_inspection: 'Missing completion inspection',
  inspection_discrepancy: 'Inspection discrepancy',
  booking_concern_mismatch: 'Booking concern needs review',
  back_job_concern_mismatch: 'Back-job concern needs review',
  concern_not_supported: 'Customer concern needs review',
};

const canonicalFindingCategory = (value: unknown) => {
  const code = String(value ?? '').trim().toLowerCase();
  return FINDING_CATEGORY_BY_CODE[code] ?? 'Quality gate finding';
};

const approvedIntakeFindings = (jobOrder: QualityGateEvidenceRecord) =>
  asEvidenceRecords(jobOrder.intakeFindings ?? jobOrder.inspectionFindings).filter(
    (finding) =>
      finding.approvedForStaffUse === true ||
      finding.staffApproved === true ||
      finding.staffVisible === true,
  );

export const canonicalizeQualityGateAiEvidence = (
  jobOrder: QualityGateEvidenceRecord,
  gate: QualityGateEvidenceRecord,
): CanonicalQualityGateAiEvidence => {
  const items = asEvidenceRecords(jobOrder.items);
  const photos = asEvidenceRecords(jobOrder.photos);
  const progressEntries = asEvidenceRecords(jobOrder.progressEntries);
  const findings = asEvidenceRecords(gate.findings);
  const preCheckSummary = (gate.preCheckSummary ?? {}) as QualityGateEvidenceRecord;
  const intakeFindings = approvedIntakeFindings(jobOrder);
  const services = items.map((item) => {
    const service = item.service;
    const serviceName =
      item.serviceName ??
      (service && typeof service === 'object' ? (service as QualityGateEvidenceRecord).name : undefined) ??
      item.name;
    return {
      category: canonicalDisplayText(serviceName, 'Service item'),
      status: item.isCompleted === true ? 'completed' as const : 'incomplete' as const,
    };
  }).sort((left, right) =>
    `${left.category}:${left.status}`.localeCompare(`${right.category}:${right.status}`),
  );
  const deterministicFindings = findings.map((finding) => ({
    category: canonicalFindingCategory(finding.code),
    gate: ['foundation', 'gate_1', 'gate_2'].includes(String(finding.gate))
      ? String(finding.gate) as 'foundation' | 'gate_1' | 'gate_2'
      : 'other' as const,
    severity: ['info', 'warning', 'critical'].includes(String(finding.severity))
      ? String(finding.severity) as 'info' | 'warning' | 'critical'
      : 'other' as const,
  })).sort((left, right) =>
    `${left.gate}:${left.severity}:${left.category}`.localeCompare(
      `${right.gate}:${right.severity}:${right.category}`,
    ),
  );
  const recommendation = String(preCheckSummary.automatedRecommendation);

  return {
    schemaVersion: 'qa-precheck-evidence.v1',
    evidenceTimestamp: asEvidenceDate(jobOrder.updatedAt ?? gate.lastAuditCompletedAt).toISOString(),
    services,
    checklist: {
      completedCount: services.filter((service) => service.status === 'completed').length,
      totalCount: services.length,
    },
    requiredEvidence: {
      photoCount: photos.length,
      state: photos.length > 0 ? 'present' : 'missing',
    },
    progress: {
      entryCount: progressEntries.length,
      state: progressEntries.length > 0 ? 'recorded' : 'missing',
    },
    approvedIntakeFindings: intakeFindings
      .map((finding) => canonicalFindingCategory(finding.code ?? finding.category))
      .sort(),
    deterministicFindings,
    evidenceGapCount: Math.max(0, Number(preCheckSummary.evidenceGapCount ?? 0)),
    automatedRecommendation:
      recommendation === 'ready_for_review' || recommendation === 'manual_review_required'
        ? recommendation
        : 'unknown',
  };
};

export const buildQualityGateAiSummaryEvidence = (
  canonical: CanonicalQualityGateAiEvidence,
): LifecycleSummaryEvidence[] => {
  const occurredAt = asEvidenceDate(canonical.evidenceTimestamp);
  const evidence: LifecycleSummaryEvidence[] = [];
  const add = (
    eventType: string,
    sourceType: LifecycleSummaryEvidence['sourceType'] = 'quality_gate',
  ) => evidence.push({
    eventType,
    eventCategory: 'verified',
    sourceType,
    occurredAt,
  });

  add(canonical.schemaVersion);
  canonical.services.forEach((service) => {
    add(`service_${service.category}_${service.status}`, 'job_order');
  });
  add(`checklist_${canonical.checklist.completedCount}_of_${canonical.checklist.totalCount}`, 'job_order');
  add(`required_evidence_${canonical.requiredEvidence.state}_${canonical.requiredEvidence.photoCount}`, 'inspection');
  add(`progress_${canonical.progress.state}_${canonical.progress.entryCount}`, 'job_order');
  add(`deterministic_evidence_gap_count_${canonical.evidenceGapCount}`);
  add(`deterministic_intake_finding_count_${canonical.approvedIntakeFindings.length}`, 'inspection');
  canonical.approvedIntakeFindings.forEach((category) => {
    add(`approved_intake_${category}`, 'inspection');
  });
  canonical.deterministicFindings.forEach((finding) => {
    add(`gate_${finding.gate}_${finding.severity}_${finding.category}`);
  });
  add(`deterministic_recommendation_${canonical.automatedRecommendation}`);
  return evidence;
};

export const buildQualityGateEvidenceFingerprint = (
  canonical: CanonicalQualityGateAiEvidence,
) => `qa-precheck-v1:${createHash('sha256').update(JSON.stringify(canonical)).digest('hex')}`;

@Injectable()
export class QualityGatesService {
  constructor(
    private readonly qualityGatesRepository: QualityGatesRepository,
    private readonly jobOrdersRepository: JobOrdersRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly backJobsRepository: BackJobsRepository,
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly usersService: UsersService,
    private readonly eventBus: AutocareEventBusService,
    private readonly qualityGateDiscrepancyEngine: QualityGateDiscrepancyEngineService,
    private readonly qualityGateSemanticAuditor: QualityGateSemanticAuditorService,
    private readonly staffWorkQueuesService: StaffWorkQueuesService,
    @InjectQueue(AI_WORKER_QUEUE_NAME)
    private readonly aiWorkerQueue: Queue,
    @Optional()
    private readonly injectedAiSummaryProvider?: VehicleLifecycleSummaryProviderService,
  ) {}

  private getAiSummaryProvider() {
    return this.injectedAiSummaryProvider ?? new VehicleLifecycleSummaryProviderService();
  }

  async beginQualityGate(jobOrderId: string) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const workItems = jobOrder.items ?? [];
    const photos = jobOrder.photos ?? [];
    if (jobOrder.status !== 'ready_for_qa') {
      throw new ConflictException('Quality gate can only start when the job order is ready for QA');
    }

    const requestedAt = new Date().toISOString();
    const jobId = toBullSafeJobId(`quality-gate:${jobOrderId}:${requestedAt}`);
    const queuedAuditJob = createQueuedAiJobMetadata({
      queueName: AI_WORKER_QUEUE_NAME,
      jobName: RUN_QUALITY_GATE_AUDIT_JOB_NAME,
      jobId,
      requestedAt,
      attemptsAllowed: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
    });

    const gate = await this.qualityGatesRepository.upsertPending(jobOrderId, queuedAuditJob);

    try {
      await this.aiWorkerQueue.add(
        RUN_QUALITY_GATE_AUDIT_JOB_NAME,
        {
          jobOrderId,
          requestedAt,
        },
        {
          jobId,
          attempts: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
          backoff: {
            type: 'fixed',
            delay: DEFAULT_AI_WORKER_JOB_BACKOFF_MS,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      );
    } catch (error) {
      const message = this.getErrorMessage(error);
      const failureMessage = `Quality gate audit could not be queued: ${message}`;

      return this.qualityGatesRepository.completeAudit(jobOrderId, {
        status: 'pending_review',
        preCheckStatus: 'unavailable',
        preCheckSummary: {
          completedWorkItemCount: 0,
          totalWorkItemCount: workItems.length,
          attachedPhotoCount: photos.length,
          evidenceGapCount: 1,
          semanticMatchScore: null,
          evidenceGaps: ['Pre-check unavailable — manual review required.'],
          inspectionDiscrepancies: [],
          automatedRecommendation: 'manual_review_required',
          infrastructureState: 'pre_check_unavailable',
        },
        riskScore: 70,
        blockingReason: failureMessage,
        auditJob: this.buildFailedAuditJob(queuedAuditJob, message),
        findings: [
          this.buildAuditInfrastructureFailureFinding(
            'qa_audit_queue_unavailable',
            'Quality pre-check could not be queued, so manual adviser review is required.',
          ),
        ],
      });
    }

    const canonicalEvidence = canonicalizeQualityGateAiEvidence(
      jobOrder as unknown as QualityGateEvidenceRecord,
      gate as unknown as QualityGateEvidenceRecord,
    );
    const evidenceFingerprint = buildQualityGateEvidenceFingerprint(canonicalEvidence);
    return this.qualityGatesRepository.markAiSummaryStaleIfChanged(jobOrderId, evidenceFingerprint);
  }

  async requestPreCheckSummary(
    jobOrderId: string,
    actor: QualityGateActor,
    regenerate = false,
  ) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    this.assertViewerCanAccess(jobOrder, {
      userId: resolvedActor.id,
      role: resolvedActor.role as QualityGateActorRole,
    });

    let gate = await this.resolveGateForJobOrder(jobOrderId, jobOrder.status as string);
    if (!gate) {
      throw new ConflictException('Quality gate is not available until the job order enters ready-for-QA');
    }

    let provider: VehicleLifecycleSummaryProviderService;
    try {
      provider = this.getAiSummaryProvider();
      provider.assertAvailable();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        code: AI_SUMMARY_UNAVAILABLE_CODE,
        message: 'AI summary generation is unavailable until an OpenAI-compatible provider is configured.',
      });
    }

    const canonicalEvidence = canonicalizeQualityGateAiEvidence(
      jobOrder as unknown as QualityGateEvidenceRecord,
      gate as unknown as QualityGateEvidenceRecord,
    );
    const evidenceFingerprint = buildQualityGateEvidenceFingerprint(canonicalEvidence);
    const evidence = buildQualityGateAiSummaryEvidence(canonicalEvidence);
    const queuedProvenance = provider.buildQueuedProvenance(evidence);
    const requestedAt = new Date().toISOString();
    const jobId = toBullSafeJobId(
      `quality-gate-precheck-summary:${jobOrderId}:${evidenceFingerprint}:${requestedAt}`,
    );
    const generationId = jobId;
    const queuedJob = createQueuedAiJobMetadata({
      queueName: AI_WORKER_QUEUE_NAME,
      jobName: GENERATE_QUALITY_GATE_PRECHECK_SUMMARY_JOB_NAME,
      jobId,
      requestedAt,
      attemptsAllowed: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
    });
    const claim = await this.qualityGatesRepository.claimAiSummaryGeneration(jobOrderId, {
      evidenceFingerprint,
      generationId,
      jobId,
      requestedAt,
      provider: queuedProvenance.provider,
      model: queuedProvenance.model,
      promptVersion: queuedProvenance.promptVersion,
      provenance: queuedProvenance,
      auditJob: queuedJob,
      regenerate,
    });
    gate = claim.gate;
    if (!claim.claimed) {
      return gate;
    }

    try {
      await this.aiWorkerQueue.add(
        GENERATE_QUALITY_GATE_PRECHECK_SUMMARY_JOB_NAME,
        { jobOrderId, evidenceFingerprint, generationId, requestedAt },
        {
          jobId,
          attempts: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
          backoff: { type: 'fixed', delay: DEFAULT_AI_WORKER_JOB_BACKOFF_MS },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      );
    } catch {
      const current = gate.preCheckSummary?.aiSummary;
      if (current) {
        await this.qualityGatesRepository.updateAiSummary(
          jobOrderId,
          {
            ...current,
            status: 'generation_failed',
            summaryText: null,
            errorCode: 'AI_SUMMARY_QUEUE_FAILED',
            errorMessage: 'AI summary could not be queued. Retry or continue with deterministic QA checks.',
            auditJob: {
              ...queuedJob,
              status: 'failed',
              failedAt: new Date().toISOString(),
              lastError: 'AI summary queue unavailable',
            },
          },
          { evidenceFingerprint, generationId, jobId, requestedAt },
        );
      }
    }

    return this.qualityGatesRepository.findByJobOrderId(jobOrderId);
  }

  async runPreCheckSummaryGeneration(
    jobOrderId: string,
    evidenceFingerprint: string,
    generationId: string,
    auditJob: AiWorkerJobMetadata,
  ) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const gate = await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId);
    const current = gate?.preCheckSummary?.aiSummary;
    const identity = {
      evidenceFingerprint,
      generationId,
      jobId: auditJob.jobId,
      requestedAt: auditJob.requestedAt,
    };
    if (!gate || !matchesQualityGateAiGeneration(current, identity) || current?.status !== 'queued') {
      return gate;
    }

    await this.qualityGatesRepository.updateAiSummary(
      jobOrderId,
      { ...current, status: 'generating', auditJob },
      identity,
    );
    const generatingGate = await this.qualityGatesRepository.findByJobOrderId(jobOrderId);
    const generating = generatingGate.preCheckSummary?.aiSummary;
    if (!matchesQualityGateAiGeneration(generating, identity) || generating?.status !== 'generating') {
      return generatingGate;
    }

    const canonicalEvidence = canonicalizeQualityGateAiEvidence(
      jobOrder as unknown as QualityGateEvidenceRecord,
      generatingGate as unknown as QualityGateEvidenceRecord,
    );
    const currentFingerprint = buildQualityGateEvidenceFingerprint(canonicalEvidence);
    if (currentFingerprint !== evidenceFingerprint) {
      return this.qualityGatesRepository.updateAiSummary(
        jobOrderId,
        {
          ...generating,
          status: 'stale',
          summaryText: null,
          errorCode: 'AI_SUMMARY_EVIDENCE_CHANGED',
          errorMessage: 'QA evidence changed. Generate a new advisory summary before the verdict.',
        },
        identity,
      );
    }

    const result = await this.getAiSummaryProvider().generate({
      vehicleLabel: 'QA pre-check',
      timelineEvents: buildQualityGateAiSummaryEvidence(canonicalEvidence),
    });
    const completedAt = new Date().toISOString();
    const readySummary: QualityGateAiSummary = {
      ...generating,
      status: 'ready',
      summaryText: result.summaryText,
      provider: result.provenance.provider,
      model: result.provenance.model,
      promptVersion: result.provenance.promptVersion,
      generatedAt: completedAt,
      errorCode: null,
      errorMessage: null,
      auditJob: {
        ...auditJob,
        status: 'completed',
        completedAt,
        failedAt: null,
        lastError: null,
      },
      provenance: {
        provider: result.provenance.provider,
        model: result.provenance.model,
        promptVersion: result.provenance.promptVersion,
        evidenceRefs: result.provenance.evidenceRefs ?? [],
        evidenceSummary: result.provenance.evidenceSummary ?? 'Generated from allowlisted QA evidence.',
      },
    };
    return this.qualityGatesRepository.updateAiSummary(jobOrderId, readySummary, identity);
  }

  async handlePreCheckSummaryWorkerFailure(
    jobOrderId: string,
    evidenceFingerprint: string,
    generationId: string,
    auditJob: AiWorkerJobMetadata,
  ) {
    const gate = await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId);
    const current = gate?.preCheckSummary?.aiSummary;
    const identity = {
      evidenceFingerprint,
      generationId,
      jobId: auditJob.jobId,
      requestedAt: auditJob.requestedAt,
    };
    if (!matchesQualityGateAiGeneration(current, identity)) {
      return gate;
    }

    return this.qualityGatesRepository.updateAiSummary(
      jobOrderId,
      {
        ...current,
        status: 'generation_failed',
        summaryText: null,
        errorCode: 'AI_SUMMARY_GENERATION_FAILED',
        errorMessage: 'AI summary generation failed. Retry or continue with deterministic QA checks.',
        auditJob,
      },
      identity,
    );
  }

  async runQualityGateAudit(jobOrderId: string, auditJob?: AiWorkerJobMetadata) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    let gate = await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId);

    if (!gate) {
      const fallbackAuditJob = auditJob ?? this.buildFallbackAuditJob(jobOrderId);
      gate = await this.qualityGatesRepository.upsertPending(jobOrderId, fallbackAuditJob);
    }

    if (jobOrder.status !== 'ready_for_qa') {
      return gate;
    }

    const currentAuditJob = auditJob ?? gate.auditJob ?? this.buildFallbackAuditJob(jobOrderId);
    await this.qualityGatesRepository.updateAuditJob(jobOrderId, currentAuditJob);

    const incompleteItems = (jobOrder.items as Array<{ isCompleted: boolean }>).filter((item) => !item.isCompleted);
    const findings: QualityGateFinding[] = [];

    if (incompleteItems.length > 0) {
      findings.push({
        gate: 'foundation',
        severity: 'critical',
        code: 'incomplete_work_items',
        message: 'All job-order items must be completed before release can continue.',
      });
    }

    if ((jobOrder.progressEntries as Array<unknown>).length === 0) {
      findings.push({
        gate: 'foundation',
        severity: 'warning',
        code: 'missing_progress_evidence',
        message: 'No adviser-owned workshop progress evidence has been recorded for this job order yet.',
      });
    }

    const completedWorkText = this.buildCompletedWorkText(jobOrder);
    findings.push(await this.buildGateOneSemanticFinding(jobOrder, completedWorkText));
    findings.push(...(await this.buildGateTwoFindings(jobOrder, completedWorkText)));

    const riskScore = this.calculateRiskScore(findings);
    const completedAuditJob = {
      ...currentAuditJob,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      failedAt: null,
      lastError: null,
    };

    return this.qualityGatesRepository.completeAudit(jobOrderId, {
      status: 'pending_review',
      preCheckStatus: 'completed',
      preCheckSummary: {
        completedWorkItemCount: jobOrder.items.filter((item: any) => item?.isCompleted).length,
        totalWorkItemCount: jobOrder.items.length,
        attachedPhotoCount: jobOrder.photos.length,
        evidenceGapCount: findings.filter((finding) => finding.severity !== 'info').length,
        semanticMatchScore: this.extractSemanticMatchScore(findings),
        evidenceGaps: findings
          .filter((finding) => finding.severity !== 'info')
          .map((finding) => finding.message),
        inspectionDiscrepancies: findings
          .filter((finding) => finding.gate === 'gate_2')
          .map((finding) => finding.message),
        automatedRecommendation: 'ready_for_review',
        infrastructureState: 'available',
      },
      riskScore,
      blockingReason: this.buildBlockingReason(findings),
      auditJob: completedAuditJob,
      findings,
    });
  }

  async getByJobOrderId(jobOrderId: string, actor: QualityGateActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as QualityGateActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);

    const gate = await this.resolveGateForJobOrder(jobOrderId, jobOrder.status as string);
    if (!gate) {
      throw new ConflictException('Quality gate is not available until the job order enters ready-for-QA');
    }

    return gate;
  }

  async assertReleaseAllowed(jobOrderId: string) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const gate = await this.resolveGateForJobOrder(jobOrderId, jobOrder.status as string);

    if (!gate) {
      throw new ConflictException('Quality gate must start before invoice generation');
    }

    const status = gate.status as QualityGateStatus;
    const isPassedRelease = status === 'passed' && gate.reviewerVerdict === 'passed';
    const isOverriddenRelease = status === 'overridden';
    if (!isPassedRelease && !isOverriddenRelease) {
      const verdict =
        gate.reviewerVerdict === 'blocked'
          ? 'Finalization blocked: workshop QA verdict is blocked'
          : 'Finalization blocked: QA verdict is missing';
      throw new ConflictException(verdict);
    }
  }

  async recordReviewerVerdict(
    jobOrderId: string,
    payload: RecordQualityGateVerdictDto,
    actor: QualityGateActor,
    expectedVersion?: number,
  ) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can record QA verdicts');
    }

    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const gate = await this.resolveGateForJobOrder(jobOrderId, jobOrder.status as string);
    if (!gate) {
      throw new ConflictException('QA review is not available until the job order enters ready-for-QA');
    }

    const updatedGate = await this.qualityGatesRepository.recordReviewerVerdict(jobOrderId, {
      reviewerUserId: resolvedActor.id,
      reviewerVerdict: payload.verdict,
      reviewerNote: payload.note ?? null,
      expectedVersion,
    });

    if (payload.verdict === 'blocked' && jobOrder.status === 'ready_for_qa') {
      await this.jobOrdersRepository.updateStatus(jobOrderId, {
        status: 'in_progress',
        reason: payload.note ?? 'QA reviewer blocked release and returned work to remediation.',
      });
    }

    await this.staffWorkQueuesService.completeClaim(
      'qa',
      'job_order',
      jobOrderId,
      resolvedActor.id,
    );

    return updatedGate;
  }

  async overrideBlockedGate(jobOrderId: string, payload: OverrideQualityGateDto, actor: QualityGateActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    if (resolvedActor.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can approve manual quality-gate overrides');
    }

    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const gate = await this.resolveGateForJobOrder(jobOrderId, jobOrder.status as string);
    if (!gate) {
      throw new ConflictException('Quality gate is not available until the job order enters ready-for-QA');
    }

    if (gate.status !== 'blocked') {
      throw new ConflictException('Only blocked quality gates can be manually overridden');
    }

    const overriddenGate = await this.qualityGatesRepository.createOverride(jobOrderId, {
      actorUserId: resolvedActor.id,
      actorRole: 'super_admin',
      reason: payload.reason,
    });

    if (jobOrder.status === 'in_progress' && gate.reviewerVerdict === 'blocked') {
      await this.jobOrdersRepository.updateStatus(jobOrderId, {
        status: 'ready_for_qa',
        reason: payload.reason,
      });
    }

    const latestOverride = overriddenGate.overrides[0];
    if (latestOverride) {
      this.eventBus.publish('quality_gate.overridden', {
        qualityGateId: overriddenGate.id,
        jobOrderId,
        vehicleId: jobOrder.vehicleId,
        overrideId: latestOverride.id,
        actorUserId: latestOverride.actorUserId,
        actorRole: 'super_admin',
        reason: latestOverride.reason,
      });
    }

    return overriddenGate;
  }

  async handleQualityGateAuditWorkerFailure(
    jobOrderId: string,
    auditJob: AiWorkerJobMetadata,
    errorMessage: string,
  ) {
    const failureMessage = `AI audit worker failed before finishing the QA run: ${errorMessage}`;

    if (!(await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId))) {
      await this.qualityGatesRepository.upsertPending(jobOrderId, auditJob);
    }

    return this.qualityGatesRepository.completeAudit(jobOrderId, {
      status: 'pending_review',
      preCheckStatus: 'unavailable',
      preCheckSummary: {
        completedWorkItemCount: 0,
        totalWorkItemCount: 0,
        attachedPhotoCount: 0,
        evidenceGapCount: 1,
        semanticMatchScore: null,
        evidenceGaps: ['Pre-check unavailable — manual review required.'],
        inspectionDiscrepancies: [],
        automatedRecommendation: 'manual_review_required',
        infrastructureState: 'pre_check_unavailable',
      },
      riskScore: 70,
      blockingReason: failureMessage,
      auditJob,
        findings: [
          this.buildAuditInfrastructureFailureFinding(
            'qa_audit_worker_failed',
            'Quality pre-check worker failed before completion, so manual adviser review is required.',
          ),
        ],
    });
  }

  private async resolveGateForJobOrder(jobOrderId: string, jobOrderStatus: string) {
    let gate = await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId);

    if (!gate && jobOrderStatus === 'ready_for_qa') {
      gate = await this.beginQualityGate(jobOrderId);
    }

    return gate;
  }

  private async buildGateOneSemanticFinding(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    completedWorkText: string,
  ): Promise<QualityGateFinding> {
    const sourceContext = await this.resolveConcernContext(jobOrder);

    try {
      const semanticFinding = this.qualityGateSemanticAuditor.audit({
        sourceType: sourceContext.sourceType,
        concernText: sourceContext.concernText,
        completedWorkText,
      });

      return {
        gate: 'gate_1',
        severity: semanticFinding.severity,
        code: semanticFinding.code,
        message: semanticFinding.message,
        provenance: semanticFinding.provenance,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown semantic audit failure';

      return {
        gate: 'gate_1',
        severity: 'warning',
        code: 'semantic_audit_unavailable',
        message: 'Gate 1 semantic audit could not complete, so staff should review the concern-to-work narrative manually.',
        provenance: {
          provider: 'ai-worker-fallback',
          model: 'semantic-audit-unavailable',
          promptVersion: 'quality-gates.gate1.v1',
          sourceType: sourceContext.sourceType,
          recommendation: 'review_needed',
          confidence: 'low',
          concernSummary: sourceContext.concernText || 'Concern context unavailable.',
          completedWorkSummary: completedWorkText || 'Completed work context unavailable.',
          matchedKeywords: [],
          coverageRatio: 0,
          evidenceSummary: message,
          riskContribution: 20,
        },
      };
    }
  }

  private async buildGateTwoFindings(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    completedWorkText: string,
  ) {
    const linkedBackJob =
      jobOrder.sourceType === 'back_job'
        ? await this.backJobsRepository.findOptionalById(jobOrder.sourceId)
        : null;
    const inspections = await this.inspectionsRepository.findByVehicleId(jobOrder.vehicleId);
    return this.qualityGateDiscrepancyEngine.evaluate({
      sourceType: jobOrder.sourceType as 'booking' | 'back_job',
      sourceId: jobOrder.sourceId,
      completedWorkText,
      jobOrderCreatedAt: jobOrder.createdAt ?? null,
      backJobReturnInspectionId: linkedBackJob?.returnInspectionId ?? null,
      uploadedPhotoEvidence: (jobOrder.photos ?? [])
        .filter((photo) => photo.deletedAt == null)
        .map((photo) => ({
          id: photo.id,
          linkedEntityType: photo.linkedEntityType as 'job_order' | 'progress_entry' | 'work_item' | 'qa_review',
          linkedEntityId: photo.linkedEntityId ?? null,
          caption: photo.caption ?? null,
          createdAt: photo.createdAt,
        })),
      inspections: inspections.map((inspection) => ({
        id: inspection.id,
        bookingId: inspection.bookingId ?? null,
        inspectionType: inspection.inspectionType as 'intake' | 'pre_repair' | 'completion' | 'return',
        status: inspection.status as 'pending' | 'completed' | 'needs_followup' | 'void',
        notes: inspection.notes ?? null,
        createdAt: inspection.createdAt,
        findings: (inspection.findings ?? []).map((finding) => ({
          id: finding.id,
          category: finding.category,
          label: finding.label,
          severity: finding.severity as 'info' | 'low' | 'medium' | 'high',
          notes: finding.notes ?? null,
          isVerified: finding.isVerified,
        })),
      })),
    });
  }

  private async resolveConcernContext(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
  ): Promise<{ sourceType: 'booking' | 'back_job'; concernText: string }> {
    if (jobOrder.sourceType === 'back_job') {
      const backJob = await this.backJobsRepository.findOptionalById(jobOrder.sourceId);
      const concernSegments = [
        backJob?.complaint ?? '',
        ...(backJob?.findings ?? []).flatMap((finding) => [finding.label, finding.notes ?? '']),
      ];

      return {
        sourceType: 'back_job',
        concernText: concernSegments.filter(Boolean).join(' '),
      };
    }

    const booking = await this.bookingsRepository.findOptionalById(jobOrder.sourceId);
    const concernSegments = [
      booking?.notes ?? '',
      ...(booking?.requestedServices ?? [])
        .map((requestedService) => requestedService?.service?.name ?? '')
        .filter(Boolean),
    ];

    return {
      sourceType: 'booking',
      concernText: concernSegments.filter(Boolean).join(' '),
    };
  }

  private buildCompletedWorkText(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
  ) {
    const segments = [
      jobOrder.notes ?? '',
      ...(jobOrder.items as Array<{ name: string; description: string | null; isCompleted: boolean }>)
        .filter((item) => item.isCompleted)
        .flatMap((item) => [item.name, item.description ?? '']),
      ...(jobOrder.progressEntries as Array<{ message: string }>).map((entry) => entry.message),
      ...(jobOrder.photos as Array<{ caption: string | null }>).map((photo) => photo.caption ?? ''),
    ];

    return segments.filter(Boolean).join(' ');
  }

  private calculateRiskScore(findings: QualityGateFinding[]) {
    return findings.reduce((highestRisk, finding) => {
      const contribution = finding.provenance?.riskContribution ?? this.fallbackRiskContribution(finding);
      return Math.max(highestRisk, contribution);
    }, 0);
  }

  private extractSemanticMatchScore(findings: QualityGateFinding[]) {
    const semanticFinding = findings.find((finding) => finding.gate === 'gate_1');
    const ratio = semanticFinding?.provenance?.coverageRatio;
    if (typeof ratio !== 'number' || !Number.isFinite(ratio)) {
      return null;
    }

    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }

  private buildBlockingReason(findings: QualityGateFinding[]) {
    const rankedFindings = [...findings]
      .filter((finding) => finding.severity !== 'info')
      .sort((left, right) => {
      const leftRisk = left.provenance?.riskContribution ?? this.fallbackRiskContribution(left);
      const rightRisk = right.provenance?.riskContribution ?? this.fallbackRiskContribution(right);
      return rightRisk - leftRisk;
    });

    return rankedFindings[0]?.message ?? null;
  }

  private fallbackRiskContribution(finding: QualityGateFinding) {
    const riskByCode: Record<string, number> = {
      incomplete_work_items: 85,
      missing_progress_evidence: 25,
      semantic_resolution_supported: 10,
      semantic_resolution_review_needed: 35,
      semantic_resolution_input_missing: 30,
      inspection_evidence_missing: 20,
      inspection_history_gap: 15,
      inspection_requires_followup: 70,
      verified_high_severity_unresolved: 75,
      verified_medium_severity_unresolved: 45,
      qa_audit_queue_unavailable: 70,
      qa_audit_worker_failed: 70,
    };

    return riskByCode[finding.code]
      ?? (finding.severity === 'critical'
        ? 70
        : finding.severity === 'warning'
          ? 30
          : 10);
  }

  private assertViewerCanAccess(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    actor: { userId: string; role: QualityGateActorRole },
  ) {
    if (['service_adviser', 'super_admin'].includes(actor.role)) {
      return;
    }

    throw new ForbiddenException('Only service advisers or super admins can access this quality gate');
  }

  private async assertStaffActor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Quality-gate actor not found');
    }

    if (!['service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only service advisers or super admins can access quality gates');
    }

    return user;
  }

  private buildFallbackAuditJob(jobOrderId: string): AiWorkerJobMetadata {
    return createQueuedAiJobMetadata({
      queueName: AI_WORKER_QUEUE_NAME,
      jobName: RUN_QUALITY_GATE_AUDIT_JOB_NAME,
      jobId: toBullSafeJobId(`quality-gate:${jobOrderId}`),
      requestedAt: new Date().toISOString(),
      attemptsAllowed: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
    });
  }

  private buildFailedAuditJob(auditJob: AiWorkerJobMetadata, message: string): AiWorkerJobMetadata {
    return {
      ...auditJob,
      status: 'failed',
      completedAt: null,
      failedAt: new Date().toISOString(),
      lastError: message,
    };
  }

  private buildAuditInfrastructureFailureFinding(code: string, message: string): QualityGateFinding {
    return {
      gate: 'foundation',
      severity: 'critical',
      code,
      message,
    };
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error && error.message ? error.message : 'Unknown queue failure';
  }
}
