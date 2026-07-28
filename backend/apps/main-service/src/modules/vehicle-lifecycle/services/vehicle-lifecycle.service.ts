import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
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
import { toBullSafeJobId } from '@shared/queue/queue-job-id.util';
import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import { ListCustomerVehicleTimelineQueryDto } from '../dto/list-customer-vehicle-timeline-query.dto';
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

const CUSTOMER_TIMELINE_REFRESH_TTL_MS = 5 * 60 * 1000;

const customerTimelineCopy: Record<string, { title: string; summary: string }> = {
  booking_created: {
    title: 'Booking requested',
    summary: 'Your service booking was added to the schedule.',
  },
  booking_confirmed: {
    title: 'Booking confirmed',
    summary: 'The workshop confirmed your service booking.',
  },
  booking_rescheduled: {
    title: 'Booking rescheduled',
    summary: 'Your service booking schedule was updated.',
  },
  booking_completed: {
    title: 'Booking completed',
    summary: 'The scheduled service visit was completed.',
  },
  inspection_completion_completed: {
    title: 'Inspection completed',
    summary: 'The workshop completed the vehicle inspection.',
  },
  job_order_created: {
    title: 'Workshop job created',
    summary: 'A workshop job was created for your vehicle.',
  },
  job_order_assigned: {
    title: 'Workshop job assigned',
    summary: 'The service work was assigned for workshop handling.',
  },
  job_order_in_progress: {
    title: 'Service work in progress',
    summary: 'The workshop is currently working on your vehicle.',
  },
  job_order_completed: {
    title: 'Service work completed',
    summary: 'The workshop marked the service work as complete.',
  },
  job_order_finalized: {
    title: 'Service finalized',
    summary: 'The workshop finalized the completed service.',
  },
  quality_gate_passed: {
    title: 'Quality review passed',
    summary: 'The completed service passed the workshop quality review.',
  },
  quality_gate_blocked: {
    title: 'Correction in progress',
    summary: 'The quality review returned the service for a workshop correction.',
  },
  quality_gate_overridden: {
    title: 'Quality review completed',
    summary: 'An authorized quality review decision was recorded.',
  },
  insurance_inquiry_submitted: {
    title: 'Insurance request submitted',
    summary: 'Your insurance request was submitted for staff review.',
  },
  lifecycle_summary_approved: {
    title: 'Service summary available',
    summary: 'A reviewed service summary is now available for your vehicle.',
  },
};

@Injectable()
export class VehicleLifecycleService {
  private readonly customerTimelineRefreshedAt = new Map<string, number>();
  private readonly customerTimelineRefreshes = new Map<string, Promise<void>>();

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
    @Optional() private readonly insuranceRepository?: InsuranceRepository,
  ) {}

  async findByVehicleId(vehicleId: string, actor?: LifecycleActor) {
    await this.vehiclesService.findById(vehicleId, actor);
    await this.refreshVehicleTimeline(vehicleId);

    return this.vehicleLifecycleRepository.findByVehicleId(vehicleId);
  }

  async listCustomerTimeline(
    vehicleId: string,
    query: ListCustomerVehicleTimelineQueryDto,
    actor: LifecycleActor,
  ) {
    if (actor.role !== 'customer') {
      throw new ForbiddenException('Only customers can access the customer vehicle timeline');
    }

    await this.vehiclesService.findById(vehicleId, actor);
    await this.ensureCustomerTimelineFresh(vehicleId);

    const limit = query.limit ?? 20;
    const page = await this.vehicleLifecycleRepository.listCustomerPage({
      vehicleId,
      sourceType: query.sourceType,
      cursor: this.decodeCustomerTimelineCursor(query.cursor),
      limit,
    });
    const lastItem = page.items[page.items.length - 1];

    return {
      items: page.items.map((event) => this.presentCustomerTimelineEvent(event)),
      page: {
        limit,
        hasNext: page.hasNext,
        nextCursor:
          page.hasNext && lastItem
            ? this.encodeCustomerTimelineCursor(lastItem.occurredAt, lastItem.id)
            : null,
      },
    };
  }

  async getCustomerGarageSummary(vehicleId: string, actor: LifecycleActor) {
    if (actor.role !== 'customer') {
      throw new ForbiddenException('Only customers can access the customer garage summary');
    }

    const vehicle = await this.vehiclesService.findById(vehicleId, actor);
    const [bookings, jobOrders, insuranceInquiries, insuranceRecords] = await Promise.all([
      this.bookingsRepository.findByVehicleId(vehicleId),
      this.jobOrdersRepository.findByVehicleId(vehicleId),
      this.insuranceRepository?.findInquiriesByVehicleId(vehicleId) ?? [],
      this.insuranceRepository?.findRecordsByVehicleId(vehicleId) ?? [],
    ]);
    const activeBooking = bookings.find(
      (booking) => !['completed', 'cancelled', 'declined'].includes(booking.status),
    );
    const latestJob = [...jobOrders].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )[0];
    const lastCompletedService = [...jobOrders]
      .filter((jobOrder) => jobOrder.status === 'finalized')
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )[0];
    const latestInsuranceInquiry = insuranceInquiries[0];
    const latestInsuranceRecord = insuranceRecords[0];

    const presentJob = (jobOrder: (typeof jobOrders)[number] | undefined) =>
      jobOrder
        ? {
            status: jobOrder.status,
            workshopStage: jobOrder.currentWorkshopStage ?? null,
            invoiceReference: jobOrder.invoiceRecord?.invoiceReference ?? null,
            updatedAt: new Date(jobOrder.updatedAt).toISOString(),
          }
        : null;

    return {
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color ?? null,
      },
      activeBooking: activeBooking
        ? {
            reference: activeBooking.bookingReference,
            status: activeBooking.status,
            scheduledDate: activeBooking.scheduledDate,
          }
        : null,
      latestJob: presentJob(latestJob),
      lastCompletedService: presentJob(lastCompletedService),
      insurance: latestInsuranceRecord || latestInsuranceInquiry
        ? {
            status: latestInsuranceRecord?.status ?? latestInsuranceInquiry?.status ?? 'submitted',
            providerName:
              latestInsuranceRecord?.providerName ?? latestInsuranceInquiry?.providerName ?? null,
            policyNumber:
              latestInsuranceRecord?.policyNumber ?? latestInsuranceInquiry?.policyNumber ?? null,
            policyExpiryAt: latestInsuranceInquiry?.policyExpiryAt
              ? new Date(latestInsuranceInquiry.policyExpiryAt).toISOString()
              : null,
          }
        : null,
    };
  }

  async findLatestCustomerVisibleSummary(vehicleId: string, actor?: LifecycleActor) {
    await this.vehiclesService.findById(vehicleId, actor);
    const summaries = await this.vehicleLifecycleRepository.listSummariesByVehicleId(vehicleId);

    return summaries.find((summary) => summary.customerVisible) ?? null;
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
    const jobId = toBullSafeJobId(`vehicle-lifecycle-summary:${vehicleId}:${requestedAt}`);
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
    const [bookings, inspections, insuranceInquiries, insuranceRecords, jobOrders, summaries] = await Promise.all([
      this.bookingsRepository.findByVehicleId(vehicleId),
      this.inspectionsRepository.findByVehicleId(vehicleId),
      this.insuranceRepository?.findInquiriesByVehicleId(vehicleId) ?? [],
      this.insuranceRepository?.findRecordsByVehicleId(vehicleId) ?? [],
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

    const insuranceInquiryEvents = insuranceInquiries.flatMap((inquiry) => {
      const events: AppendVehicleTimelineEventDto[] = [
        {
          vehicleId,
          eventType: 'insurance_inquiry_submitted',
          eventCategory: 'administrative',
          sourceType: 'manual',
          sourceId: inquiry.id,
          occurredAt: inquiry.createdAt,
          verified: false,
          inspectionId: null,
          actorUserId: inquiry.createdByUserId ?? inquiry.userId ?? null,
          notes: inquiry.subject ?? inquiry.reviewNotes ?? null,
          dedupeKey: `insurance-inquiry:${inquiry.id}:submitted`,
        },
      ];

      if (inquiry.status && inquiry.status !== 'submitted') {
        events.push({
          vehicleId,
          eventType: `insurance_inquiry_${inquiry.status}`,
          eventCategory: 'administrative',
          sourceType: 'manual',
          sourceId: inquiry.id,
          occurredAt: inquiry.reviewedAt ?? inquiry.updatedAt ?? inquiry.createdAt,
          verified: false,
          inspectionId: null,
          actorUserId: inquiry.reviewedByUserId ?? null,
          notes: inquiry.reviewNotes ?? inquiry.subject ?? null,
          dedupeKey: `insurance-inquiry:${inquiry.id}:status:${inquiry.status}`,
        });
      }

      return events;
    });

    const insuranceRecordEvents = insuranceRecords.map((record) => ({
      vehicleId,
      eventType: `insurance_record_${record.status}`,
      eventCategory: 'administrative' as const,
      sourceType: 'manual' as const,
      sourceId: record.id,
      occurredAt: record.updatedAt ?? record.createdAt,
      verified: false,
      inspectionId: null,
      actorUserId: null,
      notes: record.policyNumber ?? null,
      dedupeKey: `insurance-record:${record.id}:status:${record.status}`,
    }));

    const jobOrderEvents = jobOrders.flatMap((jobOrder) =>
      this.buildJobOrderTimelineEvents(jobOrder, qualityGateByJobOrderId.get(jobOrder.id) ?? null),
    );

    const summaryReviewEvents = summaries.flatMap((summary) => this.buildSummaryReviewTimelineEvents(summary));

    const timelineEvents: AppendVehicleTimelineEventDto[] = [
      ...bookingEvents,
      ...inspectionEvents,
      ...insuranceInquiryEvents,
      ...insuranceRecordEvents,
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

  private async ensureCustomerTimelineFresh(vehicleId: string) {
    const refreshedAt = this.customerTimelineRefreshedAt.get(vehicleId) ?? 0;
    if (Date.now() - refreshedAt < CUSTOMER_TIMELINE_REFRESH_TTL_MS) {
      return;
    }

    const existingRefresh = this.customerTimelineRefreshes.get(vehicleId);
    if (existingRefresh) {
      return existingRefresh;
    }

    const refresh = this.refreshVehicleTimeline(vehicleId)
      .then(() => {
        this.customerTimelineRefreshedAt.set(vehicleId, Date.now());
      })
      .finally(() => {
        this.customerTimelineRefreshes.delete(vehicleId);
      });
    this.customerTimelineRefreshes.set(vehicleId, refresh);
    await refresh;
  }

  private presentCustomerTimelineEvent(event: {
    eventType: string;
    sourceType: string;
    verified: boolean;
    occurredAt: Date | string;
  }) {
    const copy = customerTimelineCopy[event.eventType] ?? {
      title: this.humanizeTimelineEventType(event.eventType),
      summary: 'A new vehicle service update was recorded.',
    };

    return {
      eventType: event.eventType,
      sourceType: event.eventType.startsWith('insurance_') ? 'insurance' : event.sourceType,
      title: copy.title,
      summary: copy.summary,
      verified: event.verified,
      occurredAt: new Date(event.occurredAt).toISOString(),
    };
  }

  private humanizeTimelineEventType(eventType: string) {
    return eventType.split('_').filter(Boolean)
      .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`).join(' ');
  }
  private encodeCustomerTimelineCursor(occurredAt: Date | string, id: string) {
    return Buffer.from(
      JSON.stringify({
        v: 1,
        occurredAt: new Date(occurredAt).toISOString(),
        id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCustomerTimelineCursor(cursor?: string) {
    if (!cursor) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        v?: unknown;
        occurredAt?: unknown;
        id?: unknown;
      };
      const occurredAt = new Date(String(parsed.occurredAt ?? ''));
      if (
        parsed.v !== 1 ||
        Number.isNaN(occurredAt.getTime()) ||
        typeof parsed.id !== 'string' ||
        !parsed.id
      ) {
        throw new Error('Invalid cursor');
      }

      return {
        occurredAt,
        id: parsed.id,
      };
    } catch {
      throw new BadRequestException('Vehicle timeline cursor is invalid or expired');
    }
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

    if (jobOrder.invoiceRecord) {
      statusEvents.push({
        vehicleId: jobOrder.vehicleId,
        eventType: 'invoice_generated',
        eventCategory: 'administrative',
        sourceType: 'job_order',
        sourceId: jobOrder.invoiceRecord.id,
        occurredAt: jobOrder.invoiceRecord.createdAt ?? jobOrder.updatedAt,
        verified: false,
        inspectionId: null,
        actorUserId: jobOrder.invoiceRecord.finalizedByUserId ?? null,
        notes: jobOrder.invoiceRecord.invoiceReference ?? null,
        dedupeKey: `invoice:${jobOrder.invoiceRecord.id}:generated`,
      });

      if (jobOrder.invoiceRecord.paidAt) {
        statusEvents.push({
          vehicleId: jobOrder.vehicleId,
          eventType: 'invoice_paid',
          eventCategory: 'administrative',
          sourceType: 'job_order',
          sourceId: jobOrder.invoiceRecord.id,
          occurredAt: jobOrder.invoiceRecord.paidAt,
          verified: false,
          inspectionId: null,
          actorUserId: jobOrder.invoiceRecord.recordedByUserId ?? null,
          notes: jobOrder.invoiceRecord.paymentReference ?? jobOrder.invoiceRecord.invoiceReference ?? null,
          dedupeKey: `invoice:${jobOrder.invoiceRecord.id}:paid`,
        });
      }
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
