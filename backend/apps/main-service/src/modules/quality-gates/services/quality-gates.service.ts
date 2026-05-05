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
import { RecordQualityGateVerdictDto } from '../dto/record-quality-gate-verdict.dto';
import {
  QualityGateDiscrepancyEngineService,
} from './quality-gate-discrepancy-engine.service';
import {
  QualityGateSemanticAuditorService,
} from './quality-gate-semantic-auditor.service';

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateActorRole = 'technician' | 'head_technician' | 'service_adviser' | 'super_admin';
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
    const workItems = jobOrder.items ?? [];
    const photos = jobOrder.photos ?? [];
    if (jobOrder.status !== 'ready_for_qa') {
      throw new ConflictException('Quality gate can only start when the job order is ready for QA');
    }

    const availableHeadTechnicians =
      typeof this.usersService.listStaffAccounts === 'function'
        ? (await this.usersService.listStaffAccounts()).filter(
            (account) => account.isActive && account.role === 'head_technician',
          )
        : [];
    const assignedHeadTechnicianUserId = availableHeadTechnicians[0]?.id ?? null;

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
    if (assignedHeadTechnicianUserId) {
      await this.qualityGatesRepository.assignHeadTechnician(jobOrderId, assignedHeadTechnicianUserId);
    }

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
            'Quality pre-check could not be queued, so head-technician manual review is required.',
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
    if (!['passed', 'overridden'].includes(status)) {
      const verdict =
        gate.reviewerVerdict === 'blocked'
          ? 'Finalization blocked: head-technician verdict is blocked'
          : 'Finalization blocked: QA verdict is missing';
      throw new ConflictException(verdict);
    }
  }

  async recordReviewerVerdict(jobOrderId: string, payload: RecordQualityGateVerdictDto, actor: QualityGateActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    if (resolvedActor.role !== 'head_technician') {
      throw new ForbiddenException('Only head technicians can record QA verdicts');
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
    });

    if (payload.verdict === 'blocked' && jobOrder.status === 'ready_for_qa') {
      await this.jobOrdersRepository.updateStatus(jobOrderId, {
        status: 'in_progress',
        reason: payload.note ?? 'Head technician blocked QA review and returned work to remediation.',
      });
    }

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
          'Quality pre-check worker failed before completion, so manual head-technician review is required.',
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

  private extractSemanticMatchScore(findings: QualityGateFinding[]) {
    const semanticFinding = findings.find((finding) => finding.gate === 'gate_1');
    const ratio = semanticFinding?.provenance?.coverageRatio;
    if (typeof ratio !== 'number' || !Number.isFinite(ratio)) {
      return null;
    }

    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
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
    if (['head_technician', 'service_adviser', 'super_admin'].includes(actor.role)) {
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
