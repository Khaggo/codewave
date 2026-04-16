import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { QualityGatesRepository } from '@main-modules/quality-gates/repositories/quality-gates.repository';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import {
  AI_WORKER_QUEUE_NAME,
  DEFAULT_AI_WORKER_JOB_ATTEMPTS,
  DEFAULT_AI_WORKER_JOB_BACKOFF_MS,
  GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME,
} from '@shared/queue/ai-worker.constants';
import { AiWorkerJobMetadata, createQueuedAiJobMetadata } from '@shared/queue/ai-worker.types';

import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import { ReviewVehicleLifecycleSummaryDto } from '../dto/review-vehicle-lifecycle-summary.dto';
import { VehicleLifecycleRepository } from '../repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleSummaryProviderService } from './vehicle-lifecycle-summary-provider.service';

type LifecycleActor = {
  userId: string;
  role: string;
};

type JobOrderRecord = Awaited<ReturnType<JobOrdersRepository['findById']>>;
type QualityGateRecord = Awaited<ReturnType<QualityGatesRepository['findByJobOrderId']>>;
type VehicleLifecycleSummaryRecord = Awaited<ReturnType<VehicleLifecycleRepository['findSummaryById']>>;

@Injectable()
export class VehicleLifecycleService {
  constructor(
    private readonly vehicleLifecycleRepository: VehicleLifecycleRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly usersService: UsersService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly jobOrdersRepository: JobOrdersRepository,
    private readonly qualityGatesRepository: QualityGatesRepository,
    private readonly vehicleLifecycleSummaryProvider: VehicleLifecycleSummaryProviderService,
    @InjectQueue(AI_WORKER_QUEUE_NAME)
    private readonly aiWorkerQueue: Queue,
  ) {}

  async findByVehicleId(vehicleId: string) {
    await this.vehiclesService.findById(vehicleId);
    await this.refreshVehicleTimeline(vehicleId);

    return this.vehicleLifecycleRepository.findByVehicleId(vehicleId);
  }

  async appendVehicleTimelineEvent(payload: AppendVehicleTimelineEventDto) {
    await this.vehiclesService.findById(payload.vehicleId);

    if (payload.verified) {
      if (!payload.inspectionId) {
        throw new BadRequestException('Verified lifecycle events require an inspection reference');
      }

      const inspection = await this.inspectionsRepository.findById(payload.inspectionId);
      if (inspection.vehicleId !== payload.vehicleId) {
        throw new BadRequestException('Inspection does not belong to the target vehicle');
      }
    }

    return this.vehicleLifecycleRepository.create(payload);
  }

  async generateLifecycleSummary(vehicleId: string, actor: LifecycleActor) {
    await this.assertReviewer(actor);
    await this.vehiclesService.findById(vehicleId);
    const timelineEvents = await this.refreshVehicleTimeline(vehicleId);

    if (!timelineEvents.length) {
      throw new ConflictException('Lifecycle summary generation requires at least one timeline event');
    }

    const requestedAt = new Date().toISOString();
    const jobId = `vehicle-lifecycle-summary:${vehicleId}:${requestedAt}`;
    const queuedGenerationJob = createQueuedAiJobMetadata({
      queueName: AI_WORKER_QUEUE_NAME,
      jobName: GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME,
      jobId,
      requestedAt,
      attemptsAllowed: DEFAULT_AI_WORKER_JOB_ATTEMPTS,
    });

    const createdSummary = await this.vehicleLifecycleRepository.createSummary({
      vehicleId,
      requestedByUserId: actor.userId,
      summaryText: 'Lifecycle summary generation is queued and awaiting worker execution.',
      status: 'queued',
      generationJob: queuedGenerationJob,
      provenance: this.buildQueuedSummaryProvenance(timelineEvents),
    });

    await this.aiWorkerQueue.add(
      GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME,
      {
        summaryId: createdSummary.id,
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

    return createdSummary;
  }

  async runLifecycleSummaryGeneration(summaryId: string, generationJob: AiWorkerJobMetadata) {
    const summary = await this.vehicleLifecycleRepository.findSummaryById(summaryId);
    const vehicle = await this.vehiclesService.findById(summary.vehicleId);
    const timelineEvents = await this.refreshVehicleTimeline(summary.vehicleId);

    if (!timelineEvents.length) {
      return this.handleLifecycleSummaryWorkerFailure(
        summaryId,
        {
          ...generationJob,
          status: 'failed',
          failedAt: new Date().toISOString(),
          lastError: 'Lifecycle summary generation requires at least one timeline event',
        },
        'Lifecycle summary generation requires at least one timeline event',
      );
    }

    await this.vehicleLifecycleRepository.updateSummaryGenerationJob(summaryId, generationJob, 'generating');

    const { summaryText, provenance } = this.vehicleLifecycleSummaryProvider.generate({
      vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      timelineEvents: timelineEvents.map((event) => ({
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        sourceType: event.sourceType,
        occurredAt: new Date(event.occurredAt),
        dedupeKey: event.dedupeKey,
      })),
    });

    const completedGenerationJob = {
      ...generationJob,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      failedAt: null,
      lastError: null,
    };

    return this.vehicleLifecycleRepository.completeSummaryGeneration(summaryId, {
      summaryText,
      provenance,
      generationJob: completedGenerationJob,
    });
  }

  async reviewLifecycleSummary(
    vehicleId: string,
    summaryId: string,
    payload: ReviewVehicleLifecycleSummaryDto,
    actor: LifecycleActor,
  ) {
    await this.assertReviewer(actor);
    await this.vehiclesService.findById(vehicleId);

    const summary = await this.vehicleLifecycleRepository.findSummaryById(summaryId);
    if (summary.vehicleId !== vehicleId) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    if (summary.status === 'queued' || summary.status === 'generating') {
      throw new ConflictException('Vehicle lifecycle summary is still generating and cannot be reviewed yet');
    }

    if (summary.status === 'generation_failed') {
      throw new ConflictException('Vehicle lifecycle summary generation failed and must be regenerated before review');
    }

    if (summary.status !== 'pending_review') {
      throw new ConflictException('Vehicle lifecycle summary has already been reviewed');
    }

    const reviewedAt = new Date();
    return this.vehicleLifecycleRepository.reviewSummary(summaryId, {
      status: payload.decision,
      reviewNotes: payload.reviewNotes ?? null,
      reviewedByUserId: actor.userId,
      reviewedAt,
      customerVisible: payload.decision === 'approved',
      customerVisibleAt: payload.decision === 'approved' ? reviewedAt : null,
    });
  }

  async handleLifecycleSummaryWorkerFailure(
    summaryId: string,
    generationJob: AiWorkerJobMetadata,
    errorMessage: string,
  ) {
    return this.vehicleLifecycleRepository.failSummaryGeneration(summaryId, {
      summaryText: `Lifecycle summary generation failed: ${errorMessage}`,
      generationJob,
    });
  }

  async refreshVehicleTimeline(vehicleId: string) {
    const [bookings, inspections, jobOrders, summaries] = await Promise.all([
      this.bookingsRepository.findByVehicleId(vehicleId),
      this.inspectionsRepository.findByVehicleId(vehicleId),
      this.jobOrdersRepository.findByVehicleId(vehicleId),
      this.vehicleLifecycleRepository.listSummariesByVehicleId(vehicleId),
    ]);
    const qualityGates = await this.qualityGatesRepository.findByJobOrderIds(jobOrders.map((jobOrder) => jobOrder.id));
    const qualityGateByJobOrderId = new Map(qualityGates.map((qualityGate) => [qualityGate.jobOrderId, qualityGate]));

    const bookingEvents = bookings.flatMap((booking) =>
      booking.statusHistory.map((statusEntry) => ({
        vehicleId,
        eventType:
          statusEntry.previousStatus === null
            ? 'booking_created'
            : statusEntry.nextStatus === 'rescheduled'
              ? 'booking_rescheduled'
              : `booking_${statusEntry.nextStatus}`,
        eventCategory: 'administrative' as const,
        sourceType: 'booking' as const,
        sourceId: booking.id,
        occurredAt: statusEntry.changedAt,
        verified: false,
        inspectionId: null,
        actorUserId: statusEntry.changedByUserId ?? null,
        notes: statusEntry.reason ?? null,
        dedupeKey: `booking:${booking.id}:history:${statusEntry.id}`,
      })),
    );

    const inspectionEvents = inspections.map((inspection) => ({
      vehicleId,
      eventType: `inspection_${inspection.inspectionType}_${inspection.status}`,
      eventCategory: inspection.status === 'completed' ? ('verified' as const) : ('administrative' as const),
      sourceType: 'inspection' as const,
      sourceId: inspection.id,
      occurredAt: inspection.createdAt,
      verified: inspection.status === 'completed',
      inspectionId: inspection.id,
      actorUserId: inspection.inspectorUserId ?? null,
      notes: inspection.notes ?? null,
      dedupeKey: `inspection:${inspection.id}:${inspection.status}`,
    }));

    const jobOrderEvents = jobOrders.flatMap((jobOrder) =>
      this.buildJobOrderTimelineEvents(jobOrder, qualityGateByJobOrderId.get(jobOrder.id) ?? null),
    );

    const summaryReviewEvents = summaries.flatMap((summary) => this.buildSummaryReviewTimelineEvents(summary));

    const timelineEvents: AppendVehicleTimelineEventDto[] = [
      ...bookingEvents,
      ...inspectionEvents,
      ...jobOrderEvents,
      ...summaryReviewEvents,
    ].sort(
      (left, right) => {
        const occurredAtDiff = new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
        if (occurredAtDiff !== 0) {
          return occurredAtDiff;
        }

        return left.dedupeKey.localeCompare(right.dedupeKey);
      },
    );

    await this.vehicleLifecycleRepository.replaceForVehicle(vehicleId, timelineEvents);
    return timelineEvents;
  }

  private buildJobOrderTimelineEvents(jobOrder: JobOrderRecord, qualityGate: QualityGateRecord | null) {
    const createdEvent: AppendVehicleTimelineEventDto = {
      vehicleId: jobOrder.vehicleId,
      eventType: 'job_order_created',
      eventCategory: 'administrative',
      sourceType: 'job_order',
      sourceId: jobOrder.id,
      occurredAt: jobOrder.createdAt,
      verified: false,
      inspectionId: null,
      actorUserId: jobOrder.serviceAdviserUserId,
      notes: jobOrder.notes ?? null,
      dedupeKey: `job-order:${jobOrder.id}:created`,
    };

    const statusEvents: AppendVehicleTimelineEventDto[] = [];
    if (jobOrder.status !== 'draft') {
      statusEvents.push({
        vehicleId: jobOrder.vehicleId,
        eventType: `job_order_${jobOrder.status}`,
        eventCategory: 'administrative',
        sourceType: 'job_order',
        sourceId: jobOrder.id,
        occurredAt: jobOrder.status === 'finalized'
          ? (jobOrder.invoiceRecord?.createdAt ?? jobOrder.updatedAt)
          : jobOrder.updatedAt,
        verified: false,
        inspectionId: null,
        actorUserId: jobOrder.status === 'assigned'
          ? jobOrder.serviceAdviserUserId
          : (jobOrder.status === 'finalized' ? (jobOrder.invoiceRecord?.finalizedByUserId ?? null) : null),
        notes: jobOrder.status === 'finalized'
          ? (jobOrder.invoiceRecord?.summary ?? null)
          : null,
        dedupeKey: `job-order:${jobOrder.id}:status:${jobOrder.status}`,
      });
    }

    return [
      createdEvent,
      ...statusEvents,
      ...this.buildQualityGateTimelineEvents(jobOrder, qualityGate),
    ];
  }

  private buildQualityGateTimelineEvents(jobOrder: JobOrderRecord, qualityGate: QualityGateRecord | null) {
    if (!qualityGate) {
      return [];
    }

    const events: AppendVehicleTimelineEventDto[] = [];
    const auditCompletedAt = qualityGate.lastAuditCompletedAt ?? qualityGate.updatedAt;

    if (qualityGate.status === 'passed') {
      events.push({
        vehicleId: jobOrder.vehicleId,
        eventType: 'quality_gate_passed',
        eventCategory: 'administrative',
        sourceType: 'quality_gate',
        sourceId: qualityGate.id,
        occurredAt: auditCompletedAt,
        verified: false,
        inspectionId: null,
        actorUserId: null,
        notes: null,
        dedupeKey: `quality-gate:${qualityGate.id}:status:passed`,
      });
    }

    if (qualityGate.status === 'blocked' || qualityGate.status === 'overridden') {
      events.push({
        vehicleId: jobOrder.vehicleId,
        eventType: 'quality_gate_blocked',
        eventCategory: 'administrative',
        sourceType: 'quality_gate',
        sourceId: qualityGate.id,
        occurredAt: auditCompletedAt,
        verified: false,
        inspectionId: null,
        actorUserId: null,
        notes: qualityGate.blockingReason ?? null,
        dedupeKey: `quality-gate:${qualityGate.id}:status:blocked`,
      });
    }

    if (qualityGate.status === 'overridden' && qualityGate.overrides.length > 0) {
      const latestOverride = qualityGate.overrides[0];
      events.push({
        vehicleId: jobOrder.vehicleId,
        eventType: 'quality_gate_overridden',
        eventCategory: 'administrative',
        sourceType: 'quality_gate',
        sourceId: qualityGate.id,
        occurredAt: latestOverride.createdAt,
        verified: false,
        inspectionId: null,
        actorUserId: latestOverride.actorUserId,
        notes: latestOverride.reason,
        dedupeKey: `quality-gate:${qualityGate.id}:override:${latestOverride.id}`,
      });
    }

    return events;
  }

  private buildSummaryReviewTimelineEvents(summary: VehicleLifecycleSummaryRecord) {
    if (summary.status === 'pending_review' || !summary.reviewedAt) {
      return [];
    }

    return [
      {
        vehicleId: summary.vehicleId,
        eventType: `lifecycle_summary_${summary.status}`,
        eventCategory: 'administrative' as const,
        sourceType: 'lifecycle_summary' as const,
        sourceId: summary.id,
        occurredAt: summary.reviewedAt,
        verified: false,
        inspectionId: null,
        actorUserId: summary.reviewedByUserId ?? null,
        notes: summary.reviewNotes ?? null,
        dedupeKey: `lifecycle-summary:${summary.id}:review:${summary.status}`,
      },
    ];
  }

  private async assertReviewer(actor: LifecycleActor) {
    const reviewer = await this.usersService.findById(actor.userId);
    if (!reviewer || !reviewer.isActive) {
      throw new NotFoundException('Lifecycle reviewer not found');
    }

    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can manage lifecycle summaries');
    }

    return reviewer;
  }

  private buildQueuedSummaryProvenance(
    timelineEvents: Array<{ dedupeKey: string }>,
  ) {
    return {
      provider: 'ai-worker-placeholder',
      model: 'queued-summary-generation',
      promptVersion: 'vehicle-lifecycle.summary.v1',
      evidenceRefs: timelineEvents.map((event) => event.dedupeKey),
      evidenceSummary:
        'Lifecycle evidence is queued for AI worker processing and remains hidden from customers until human review completes.',
    };
  }
}
