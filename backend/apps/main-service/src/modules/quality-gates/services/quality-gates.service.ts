import { Inject, Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { UsersService } from '@main-modules/users/services/users.service';

import { QUALITY_GATE_AUDIT_JOB_NAME, QUALITY_GATES_QUEUE_NAME } from '../quality-gates.constants';
import { QualityGatesRepository } from '../repositories/quality-gates.repository';
import { qualityGateStatusEnum } from '../schemas/quality-gates.schema';

type QualityGateStatus = (typeof qualityGateStatusEnum.enumValues)[number];
type QualityGateActorRole = 'technician' | 'service_adviser' | 'super_admin';
type QualityGateActor = {
  userId: string;
  role: string;
};

@Injectable()
export class QualityGatesService {
  constructor(
    private readonly qualityGatesRepository: QualityGatesRepository,
    private readonly jobOrdersRepository: JobOrdersRepository,
    private readonly usersService: UsersService,
    @InjectQueue(QUALITY_GATES_QUEUE_NAME)
    private readonly qualityGatesQueue: Queue,
  ) {}

  async beginQualityGate(jobOrderId: string) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    if (jobOrder.status !== 'ready_for_qa') {
      throw new ConflictException('Quality gate can only start when the job order is ready for QA');
    }

    const gate = await this.qualityGatesRepository.upsertPending(jobOrderId);
    await this.qualityGatesQueue.add(
      QUALITY_GATE_AUDIT_JOB_NAME,
      {
        jobOrderId,
      },
      {
        jobId: `quality-gate:${jobOrderId}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );

    return gate;
  }

  async runQualityGateAudit(jobOrderId: string) {
    const jobOrder = await this.jobOrdersRepository.findById(jobOrderId);
    const gate = (await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId))
      ?? (await this.qualityGatesRepository.upsertPending(jobOrderId));

    if (jobOrder.status !== 'ready_for_qa') {
      return gate;
    }

    const incompleteItems = (jobOrder.items as Array<{ isCompleted: boolean }>).filter((item) => !item.isCompleted);
    const findings: Array<{
      gate: 'foundation';
      severity: 'critical' | 'warning';
      code: string;
      message: string;
    }> = [];

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

    const hasBlockingFinding = findings.some((finding) => finding.severity === 'critical');
    const riskScore = hasBlockingFinding ? 85 : findings.length > 0 ? 25 : 0;

    return this.qualityGatesRepository.completeAudit(jobOrderId, {
      status: hasBlockingFinding ? 'blocked' : 'passed',
      riskScore,
      blockingReason: hasBlockingFinding
        ? 'Quality gate found blocking issues that must be resolved before release.'
        : null,
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

  private async resolveGateForJobOrder(jobOrderId: string, jobOrderStatus: string) {
    let gate = await this.qualityGatesRepository.findOptionalByJobOrderId(jobOrderId);

    if (!gate && jobOrderStatus === 'ready_for_qa') {
      gate = await this.beginQualityGate(jobOrderId);
    }

    if (gate?.status === 'pending' && jobOrderStatus === 'ready_for_qa') {
      gate = await this.runQualityGateAudit(jobOrderId);
    }

    return gate;
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
}
