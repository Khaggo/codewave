import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { UsersService } from '@main-modules/users/services/users.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import {
  AI_WORKER_QUEUE_NAME,
  DEFAULT_AI_WORKER_JOB_ATTEMPTS,
  DEFAULT_AI_WORKER_JOB_BACKOFF_MS,
  RUN_QUALITY_GATE_AUDIT_JOB_NAME,
} from '@shared/queue/ai-worker.constants';
import { AiWorkerJobMetadata, createQueuedAiJobMetadata } from '@shared/queue/ai-worker.types';
import { toBullSafeJobId } from '@shared/queue/queue-job-id.util';

import { QualityGatesRepository } from '../repositories/quality-gates.repository';
import { QualityGateFindingProvenance, qualityGateStatusEnum } from '../schemas/quality-gates.schema';
import { OverrideQualityGateDto } from '../dto/override-quality-gate.dto';
import {
  QualityGateDiscrepancyEngineService,
} from './quality-gate-discrepancy-engine.service';
import {
  QualityGateSemanticAuditorService,
} from './quality-gate-semantic-auditor.service';

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateActorRole = 'technician' | 'service_adviser' | 'super_admin';
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
    @InjectQueue(AI_WORKER_QUEUE_NAME)
    private readonly aiWorkerQueue: Queue,
  ) {}

  async beginQualityGate(jobOrderId: string) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    if (jobOrder.status !== 'ready_for_qa') {
      throw new ConflictException('Quality gate can only start when the job order is ready for QA');
    }

    const requestedAt = new Date().toISOString();
    const jobId = toBullSafeJobId(`quality-gate:${jobOrderId}`);
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
        status: 'blocked',
        riskScore: 70,
        blockingReason: failureMessage,
        auditJob: this.buildFailedAuditJob(queuedAuditJob, message),
        findings: [
          this.buildAuditInfrastructureFailureFinding(
            'qa_audit_queue_unavailable',
            'Quality-gate audit could not be queued, so release is blocked until staff retries QA or a super admin records an override.',
          ),
        ],
      });
    }

    return gate;
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
        message: 'No technician progress evidence has been recorded for this job order yet.',
      });
    }

    const completedWorkText = this.buildCompletedWorkText(jobOrder);
    findings.push(await this.buildGateOneSemanticFinding(jobOrder, completedWorkText));
    findings.push(...(await this.buildGateTwoFindings(jobOrder, completedWorkText)));

    const riskScore = this.calculateRiskScore(findings);
    const hasBlockingFinding = riskScore >= 60;
    const completedAuditJob = {
      ...currentAuditJob,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      failedAt: null,
      lastError: null,
    };

    return this.qualityGatesRepository.completeAudit(jobOrderId, {
      status: hasBlockingFinding ? 'blocked' : 'passed',
      riskScore,
      blockingReason: hasBlockingFinding ? this.buildBlockingReason(findings) : null,
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
    if (status === 'blocked') {
      throw new ConflictException('Quality gate is blocked and must be resolved before invoice generation');
    }

    if (!['passed', 'overridden'].includes(status)) {
      throw new ConflictException('Quality gate must pass before invoice generation');
    }
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
      status: 'blocked',
      riskScore: 70,
      blockingReason: failureMessage,
      auditJob,
      findings: [
        this.buildAuditInfrastructureFailureFinding(
          'qa_audit_worker_failed',
          'Quality-gate audit worker failed before completion, so release is blocked until staff retries QA or a super admin records an override.',
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
    const inspections = await this.inspectionsRepository.findByVehicleId(jobOrder.vehicleId);
    return this.qualityGateDiscrepancyEngine.evaluate({
      sourceType: jobOrder.sourceType as 'booking' | 'back_job',
      sourceId: jobOrder.sourceId,
      completedWorkText,
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

  private buildBlockingReason(findings: QualityGateFinding[]) {
    const rankedFindings = [...findings].sort((left, right) => {
      const leftRisk = left.provenance?.riskContribution ?? this.fallbackRiskContribution(left);
      const rightRisk = right.provenance?.riskContribution ?? this.fallbackRiskContribution(right);
      return rightRisk - leftRisk;
    });

    return rankedFindings[0]?.message
      ?? 'Quality gate found blocking issues that must be resolved before release.';
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

    const assignments = jobOrder.assignments as Array<{ technicianUserId: string }>;
    const isAssignedTechnician = assignments.some(
      (assignment) => assignment.technicianUserId === actor.userId,
    );

    if (!isAssignedTechnician) {
      throw new ForbiddenException('Only assigned technicians or staff reviewers can access this quality gate');
    }
  }

  private async assertStaffActor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Quality-gate actor not found');
    }

    if (!['technician', 'service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only staff accounts can access quality gates');
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
