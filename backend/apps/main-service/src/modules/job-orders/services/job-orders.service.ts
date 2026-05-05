import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { SmtpMailService } from '@main-modules/notifications/services/smtp-mail.service';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';

import { AddJobOrderPhotoDto } from '../dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../dto/add-job-order-progress.dto';
import { CreateJobOrderDto } from '../dto/create-job-order.dto';
import { FinalizeJobOrderDto } from '../dto/finalize-job-order.dto';
import {
  ListJobOrderWorkbenchQueryDto,
  type JobOrderWorkbenchScope,
} from '../dto/list-job-order-workbench-query.dto';
import { RecordJobOrderInvoicePaymentDto } from '../dto/record-job-order-invoice-payment.dto';
import { ReplaceJobOrderAssignmentsDto } from '../dto/replace-job-order-assignments.dto';
import { UpdateJobOrderStatusDto } from '../dto/update-job-order-status.dto';
import { UploadJobOrderPhotoDto } from '../dto/upload-job-order-photo.dto';
import { JobOrdersRepository } from '../repositories/job-orders.repository';
import { jobOrderStatusEnum } from '../schemas/job-orders.schema';
import { JobOrderEvidenceStorageService } from './job-order-evidence-storage.service';
import { JobOrderInvoicePdfService } from './job-order-invoice-pdf.service';

type JobOrderActorRole = 'technician' | 'head_technician' | 'service_adviser' | 'super_admin';
type JobOrderActor = {
  userId: string;
  role: string;
};
type CustomerReadableActorRole = 'customer' | JobOrderActorRole;
type JobOrderStatus = (typeof jobOrderStatusEnum.enumValues)[number];

const allowedStatusTransitions: Record<JobOrderStatus, JobOrderStatus[]> = {
  draft: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'ready_for_qa', 'cancelled'],
  ready_for_qa: ['in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  finalized: [],
  cancelled: [],
};

const technicianAllowedStatuses: JobOrderStatus[] = ['in_progress', 'blocked', 'ready_for_qa'];
const assignmentRequiredStatuses: JobOrderStatus[] = [
  'assigned',
  'in_progress',
  'blocked',
  'ready_for_qa',
  'finalized',
];
const assignmentRepairCandidateStatuses: JobOrderStatus[] = [
  'assigned',
  'in_progress',
  'blocked',
  'ready_for_qa',
  'finalized',
];
const activeWorkbenchStatuses: JobOrderStatus[] = ['draft', 'assigned', 'in_progress', 'blocked', 'ready_for_qa'];
const historyWorkbenchStatuses: JobOrderStatus[] = ['finalized', 'cancelled'];

@Injectable()
export class JobOrdersService {
  constructor(
    private readonly jobOrdersRepository: JobOrdersRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly backJobsRepository: BackJobsRepository,
    private readonly usersService: UsersService,
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly qualityGatesService: QualityGatesService,
    private readonly eventBus: AutocareEventBusService,
    @Optional()
    private readonly evidenceStorageService: JobOrderEvidenceStorageService,
    @Optional()
    private readonly invoicePdfService: JobOrderInvoicePdfService,
    @Optional()
    private readonly smtpMailService: SmtpMailService,
  ) {}

  async create(payload: CreateJobOrderDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);

    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can create job orders');
    }

    const sourceContext = await this.assertSource(payload);
    await this.assertCustomerAndVehicle(payload);
    await this.assertServiceAdviserSnapshot(payload, {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    });
    await this.assertTechnicians(payload.assignedTechnicianIds);

    const createdJobOrder = await this.jobOrdersRepository.create({
      ...payload,
      jobType: sourceContext.jobType,
      parentJobOrderId: sourceContext.parentJobOrderId,
      status: payload.assignedTechnicianIds?.length ? 'assigned' : 'draft',
    });

    if (payload.sourceType === 'back_job') {
      await this.backJobsRepository.linkReworkJobOrder(payload.sourceId, createdJobOrder.id);
      return this.jobOrdersRepository.findById(createdJobOrder.id);
    }

    await this.syncBookingLifecycleForJobOrderHandoff(createdJobOrder.sourceId);

    return createdJobOrder;
  }

  async listAssignedToTechnician(actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);

    if (resolvedActor.role !== 'technician') {
      throw new ForbiddenException('Only technicians can list their assigned job orders');
    }

    return this.jobOrdersRepository.findAssignedToTechnician(resolvedActor.id);
  }

  async listWorkbenchSummaries(actor: JobOrderActor, query: ListJobOrderWorkbenchQueryDto) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const summaries =
      resolvedActor.role === 'technician'
        ? await this.jobOrdersRepository.findAssignedSummaries(resolvedActor.id)
        : await this.jobOrdersRepository.findAllSummaries();
    const allowedStatuses = this.resolveWorkbenchStatuses(query.scope);

    const bookingSourceIds = summaries
      .filter((jobOrder) => jobOrder.sourceType === 'booking')
      .map((jobOrder) => jobOrder.sourceId);
    const scheduledDateRows = await this.bookingsRepository.findScheduledDatesByIds(bookingSourceIds);
    const scheduledDateByBookingId = new Map(
      scheduledDateRows.map((row) => [row.id, row.scheduledDate]),
    );

    return summaries
      .map((jobOrder) => {
        const fallbackDate = jobOrder.createdAt.toISOString().slice(0, 10);
        const workDate =
          jobOrder.sourceType === 'booking'
            ? scheduledDateByBookingId.get(jobOrder.sourceId) ?? fallbackDate
            : fallbackDate;

        return {
          id: jobOrder.id,
          status: jobOrder.status,
          sourceType: jobOrder.sourceType,
          workDate,
          vehicleId: jobOrder.vehicleId,
          serviceAdviserCode: jobOrder.serviceAdviserCode,
          assignedTechnicianIds: (jobOrder.assignments ?? [])
            .map((assignment) => assignment.technicianUserId)
            .filter(Boolean),
          updatedAt: jobOrder.updatedAt.toISOString(),
        };
      })
      .filter((jobOrder) => (allowedStatuses ? allowedStatuses.includes(jobOrder.status as JobOrderStatus) : true))
      .filter((jobOrder) => (query.month ? jobOrder.workDate.startsWith(query.month) : true))
      .sort((left, right) => {
        if (left.workDate !== right.workDate) {
          return left.workDate.localeCompare(right.workDate);
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }

  async listWorkbenchCalendar(actor: JobOrderActor, query: ListJobOrderWorkbenchQueryDto) {
    const summaries = await this.listWorkbenchSummaries(actor, query);
    const month = query.month;

    const jobOrderCounts = new Map<string, number>();
    summaries.forEach((jobOrder) => {
      if (!jobOrder.workDate) return;
      jobOrderCounts.set(jobOrder.workDate, (jobOrderCounts.get(jobOrder.workDate) ?? 0) + 1);
    });

    const bookingQueueCounts = new Map<string, number>();
    if (month && query.scope !== 'history') {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const queueBookings = await this.bookingsRepository.findByScheduledDateRange(startDate, endDate, {
        statuses: ['confirmed', 'rescheduled'],
      });

      queueBookings.forEach((booking) => {
        bookingQueueCounts.set(
          booking.scheduledDate,
          (bookingQueueCounts.get(booking.scheduledDate) ?? 0) + 1,
        );
      });
    }

    return {
      jobOrderDates: [...jobOrderCounts.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((left, right) => left.date.localeCompare(right.date)),
      bookingQueueDates: [...bookingQueueCounts.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((left, right) => left.date.localeCompare(right.date)),
    };
  }

  async findByVehicleId(vehicleId: string, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can list vehicle job orders');
    }

    return this.jobOrdersRepository.findByVehicleId(vehicleId);
  }

  async findById(id: string, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);

    this.assertViewerCanAccess(jobOrder, {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    });

    return jobOrder;
  }

  async listCustomerServiceHistory(userId: string, actor: { userId: string; role: string }) {
    const resolvedActor = await this.assertCustomerReadableActor(actor.userId);
    await this.assertCanAccessCustomerHistory(userId, {
      userId: resolvedActor.id,
      role: resolvedActor.role as CustomerReadableActorRole,
    });

    const jobOrders = await this.jobOrdersRepository.findFinalizedByCustomerUserId(userId);
    const bookingSourceIds = jobOrders
      .filter((jobOrder) => jobOrder.sourceType === 'booking')
      .map((jobOrder) => jobOrder.sourceId);
    const scheduledDateRows = await this.bookingsRepository.findScheduledDatesByIds(bookingSourceIds);
    const scheduledDateByBookingId = new Map(
      scheduledDateRows.map((row) => [row.id, row.scheduledDate]),
    );
    const uniqueVehicleIds = [...new Set(jobOrders.map((jobOrder) => jobOrder.vehicleId).filter(Boolean))];
    const vehicles = await Promise.all(
      uniqueVehicleIds.map(async (vehicleId) => [vehicleId, await this.vehiclesRepository.findById(vehicleId)] as const),
    );
    const vehicleById = new Map(vehicles);

    return jobOrders.map((jobOrder) => {
      const vehicle = vehicleById.get(jobOrder.vehicleId);
      const vehicleLabel = vehicle
        ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ').trim() || vehicle.plateNumber
        : null;
      const completedServiceNames = (jobOrder.items as Array<{
        name: string;
        description?: string | null;
        isCompleted?: boolean | null;
      }>)
        .filter((item) => item.isCompleted)
        .map((item) => item.description?.trim() || item.name.trim())
        .filter(Boolean);
      const finalizedAt =
        jobOrder.invoiceRecord?.updatedAt?.toISOString?.() ??
        jobOrder.updatedAt.toISOString();

      return {
        id: `service-history-${jobOrder.id}`,
        jobOrderId: jobOrder.id,
        jobOrderReference: `JO-${jobOrder.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
        bookingDate:
          jobOrder.sourceType === 'booking'
            ? scheduledDateByBookingId.get(jobOrder.sourceId) ?? null
            : null,
        finalizedAt,
        vehicleId: jobOrder.vehicleId,
        vehicleLabel,
        completedServiceNames,
        status: 'finalized' as const,
      };
    });
  }

  async replaceAssignments(id: string, payload: ReplaceJobOrderAssignmentsDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can replace job-order assignments');
    }

    const jobOrder = await this.jobOrdersRepository.findById(id);
    const assignedTechnicianIds = this.normalizeTechnicianIds(payload.assignedTechnicianIds);
    await this.assertTechnicians(assignedTechnicianIds);

    const currentStatus = jobOrder.status as JobOrderStatus;
    if (assignedTechnicianIds.length === 0 && assignmentRequiredStatuses.includes(currentStatus)) {
      throw new ConflictException(
        'Assigned technicians can only be cleared while the job order is still draft or cancelled',
      );
    }

    const nextStatus =
      currentStatus === 'draft' && assignedTechnicianIds.length > 0 ? 'assigned' : currentStatus;

    return this.jobOrdersRepository.replaceAssignments(id, {
      assignedTechnicianIds,
      status: nextStatus,
    });
  }

  async updateStatus(id: string, payload: UpdateJobOrderStatusDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const currentStatus = jobOrder.status as JobOrderStatus;
    const assignments = jobOrder.assignments as Array<{ technicianUserId: string }>;
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);

    if (currentStatus === payload.status) {
      throw new BadRequestException('Job order is already in the requested status');
    }

    if (!allowedStatusTransitions[currentStatus].includes(payload.status)) {
      throw new ConflictException(`Cannot transition job order from ${currentStatus} to ${payload.status}`);
    }

    if (technicianAllowedStatuses.includes(payload.status) && assignments.length === 0) {
      throw new ConflictException('Assigned technicians are required before operational status changes');
    }

    if (actorInfo.role === 'technician') {
      if (!technicianAllowedStatuses.includes(payload.status)) {
        throw new ForbiddenException('Technicians can only manage in-progress, blocked, or ready-for-QA states');
      }

      const isAssignedTechnician = assignments.some(
        (assignment) => assignment.technicianUserId === actorInfo.userId,
      );

      if (!isAssignedTechnician) {
        throw new ForbiddenException('Only assigned technicians can update this job order');
      }
    }

    const updatedJobOrder = await this.jobOrdersRepository.updateStatus(id, payload);

    if (payload.status === 'ready_for_qa') {
      await this.qualityGatesService.beginQualityGate(id);
    }

    return updatedJobOrder;
  }

  async repairAssignmentRecovery() {
    const candidateJobOrders = await this.jobOrdersRepository.findByStatuses(
      assignmentRepairCandidateStatuses,
    );

    const repaired: Array<{ jobOrderId: string; status: JobOrderStatus; assignedTechnicianIds: string[] }> = [];
    const downgradedToDraft: Array<{ jobOrderId: string; previousStatus: JobOrderStatus }> = [];
    const manualReview: Array<{ jobOrderId: string; status: JobOrderStatus }> = [];

    for (const jobOrder of candidateJobOrders) {
      const currentStatus = jobOrder.status as JobOrderStatus;
      const assignments = (jobOrder.assignments ?? []) as Array<{ technicianUserId: string }>;
      if (assignments.length > 0) {
        continue;
      }

      if (currentStatus === 'finalized') {
        manualReview.push({
          jobOrderId: jobOrder.id,
          status: currentStatus,
        });
        continue;
      }

      const inferredTechnicianIds = await this.resolveValidTechnicianIds(
        (jobOrder.progressEntries ?? [])
          .map((entry) => entry?.technicianUserId)
          .filter((technicianUserId): technicianUserId is string => Boolean(technicianUserId)),
      );

      if (inferredTechnicianIds.length > 0) {
        await this.jobOrdersRepository.replaceAssignments(jobOrder.id, {
          assignedTechnicianIds: inferredTechnicianIds,
          status: currentStatus,
        });
        repaired.push({
          jobOrderId: jobOrder.id,
          status: currentStatus,
          assignedTechnicianIds: inferredTechnicianIds,
        });
        continue;
      }

      await this.jobOrdersRepository.replaceAssignments(jobOrder.id, {
        assignedTechnicianIds: [],
        status: 'draft',
        notes: this.appendAssignmentRepairNote(jobOrder.notes),
      });
      downgradedToDraft.push({
        jobOrderId: jobOrder.id,
        previousStatus: currentStatus,
      });
    }

    return {
      repaired,
      downgradedToDraft,
      manualReview,
    };
  }

  async addProgressEntry(id: string, payload: AddJobOrderProgressDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const assignments = jobOrder.assignments as Array<{ technicianUserId: string }>;
    const items = jobOrder.items as Array<{ id: string }>;
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);
    this.assertJobOrderCanAcceptEvidence(jobOrder.status);

    if (actorInfo.role === 'technician') {
      const isAssignedTechnician = assignments.some(
        (assignment) => assignment.technicianUserId === actorInfo.userId,
      );

      if (!isAssignedTechnician) {
        throw new ForbiddenException('Only assigned technicians can append progress entries');
      }
    }

    if (payload.completedItemIds?.length) {
      const jobOrderItemIds = new Set(items.map((item) => item.id));
      const hasInvalidItem = payload.completedItemIds.some((itemId) => !jobOrderItemIds.has(itemId));
      if (hasInvalidItem) {
        throw new ConflictException('Completed item references must belong to the target job order');
      }

      const itemsRequiringPhotoEvidence = (jobOrder.items as Array<{
        id: string;
        requiresPhotoEvidence?: boolean | null;
      }>).filter(
        (item) =>
          payload.completedItemIds?.includes(item.id) &&
          item.requiresPhotoEvidence !== false,
      );
      const photoEvidence = (jobOrder.photos ?? []) as Array<{
        linkedEntityType?: string | null;
        linkedEntityId?: string | null;
        deletedAt?: Date | null;
      }>;
      const missingPhotoEvidence = itemsRequiringPhotoEvidence.some(
        (item) =>
          !photoEvidence.some(
            (photo) =>
              photo.deletedAt == null &&
              photo.linkedEntityType === 'work_item' &&
              photo.linkedEntityId === item.id,
          ),
      );
      if (missingPhotoEvidence) {
        throw new ConflictException('At least one photo is required before marking this item complete.');
      }
    }

    const updatedJobOrder = await this.jobOrdersRepository.addProgressEntry(id, payload, actorInfo.userId);

    if (updatedJobOrder.status === 'ready_for_qa') {
      await this.qualityGatesService.beginQualityGate(id);
    }

    return updatedJobOrder;
  }

  async addPhoto(id: string, payload: AddJobOrderPhotoDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);
    this.assertJobOrderCanAcceptEvidence(jobOrder.status);

    const updatedJobOrder = await this.jobOrdersRepository.addPhoto(id, payload, actorInfo.userId);

    if (updatedJobOrder.status === 'ready_for_qa') {
      await this.qualityGatesService.beginQualityGate(id);
    }

    return updatedJobOrder;
  }

  async uploadPhoto(
    id: string,
    payload: UploadJobOrderPhotoDto,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    actor: JobOrderActor,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('An image upload is required');
    }

    if (!String(file.mimetype).startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported for job-order evidence');
    }

    if (!this.evidenceStorageService) {
      throw new ConflictException('Evidence upload storage is not configured');
    }

    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);
    this.assertJobOrderCanAcceptEvidence(jobOrder.status);

    const photoId = randomUUID();
    const persistedFile = await this.evidenceStorageService.saveImage({
      jobOrderId: id,
      photoId,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const updatedJobOrder = await this.jobOrdersRepository.addPhoto(
      id,
      {
        id: photoId,
        fileName: file.originalname,
        fileUrl: `/api/job-orders/${id}/photos/${photoId}/file`,
        caption: payload.caption,
        linkedEntityType: payload.linkedEntityType ?? 'job_order',
        linkedEntityId: payload.linkedEntityId ?? id,
        storageKey: persistedFile.storageKey,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
      actorInfo.userId,
    );

    if (updatedJobOrder.status === 'ready_for_qa') {
      await this.qualityGatesService.beginQualityGate(id);
    }

    return updatedJobOrder;
  }

  async finalize(id: string, payload: FinalizeJobOrderDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const items = jobOrder.items as Array<{ isCompleted: boolean }>;
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    if (!['service_adviser', 'super_admin'].includes(actorInfo.role)) {
      throw new ForbiddenException('Only service advisers or super admins can finalize job orders');
    }

    if (actorInfo.role === 'service_adviser' && actorInfo.userId !== jobOrder.serviceAdviserUserId) {
      throw new ForbiddenException('Service advisers can only finalize their own job orders');
    }

    if (jobOrder.invoiceRecord) {
      throw new ConflictException('An invoice-ready record already exists for this job order');
    }

    if (jobOrder.status !== 'ready_for_qa') {
      throw new ConflictException('Only job orders that are ready for QA can generate invoice-ready records');
    }

    if (items.length === 0 || items.some((item) => !item.isCompleted)) {
      throw new ConflictException('All job-order items must be completed before invoice generation');
    }

    await this.qualityGatesService.assertReleaseAllowed(id);

    const invoiceReference = this.generateInvoiceReference(jobOrder.id);
    const officialReceiptReference = this.generateOfficialReceiptReference(jobOrder.id);
    const amountPaidCents = this.normalizePesoAmountToCents(payload.amountPaid);
    const reservationFeeDeductionCents = 0;
    const subtotalAmountCents = Math.max(amountPaidCents + reservationFeeDeductionCents, 0);
    const laborAmountCents = subtotalAmountCents;
    const partsAmountCents = 0;
    const totalAmountCents = Math.max(subtotalAmountCents - reservationFeeDeductionCents, 0);

    const finalizedJobOrder = await this.jobOrdersRepository.finalize(id, {
      ...payload,
      summary: payload.summary?.trim() || this.buildSuggestedSummary(jobOrder) || undefined,
      finalizedByUserId: actorInfo.userId,
      invoiceReference,
      officialReceiptReference,
      amountPaid: payload.amountPaid,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference,
      receivedAt: payload.receivedAt,
      subtotalAmountCents,
      laborAmountCents,
      partsAmountCents,
      reservationFeeDeductionCents,
      totalAmountCents,
    });

    this.eventBus.publish('service.invoice_finalized', {
      jobOrderId: finalizedJobOrder.id,
      invoiceRecordId: finalizedJobOrder.invoiceRecord.id,
      invoiceReference: finalizedJobOrder.invoiceRecord.invoiceReference,
      customerUserId: finalizedJobOrder.customerUserId,
      vehicleId: finalizedJobOrder.vehicleId,
      serviceAdviserUserId: finalizedJobOrder.serviceAdviserUserId,
      serviceAdviserCode: finalizedJobOrder.serviceAdviserCode,
      finalizedByUserId: actorInfo.userId,
      sourceType: finalizedJobOrder.sourceType,
      sourceId: finalizedJobOrder.sourceId,
    });

    if (finalizedJobOrder.sourceType === 'booking') {
      await this.syncBookingLifecycleForCompletion(finalizedJobOrder.sourceId);
    }

    if (finalizedJobOrder.sourceType === 'back_job') {
      await this.syncBackJobLifecycleForCompletion(finalizedJobOrder.sourceId);
    }

    if (this.invoicePdfService && this.smtpMailService) {
      await this.generateInvoiceArtifacts(finalizedJobOrder, { attemptEmail: true });
    }

    return finalizedJobOrder;
  }

  async getPhotoBinary(id: string, photoId: string, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    this.assertViewerCanAccess(jobOrder, actorInfo);

    const photo = (jobOrder.photos as Array<{
      id: string;
      fileName: string;
      mimeType?: string | null;
      storageKey?: string | null;
    }>).find((entry) => entry.id === photoId);
    if (!photo?.storageKey) {
      throw new NotFoundException('Job-order evidence file not found');
    }

    const buffer = await this.evidenceStorageService.readImage(photo.storageKey);
    return {
      buffer,
      fileName: photo.fileName,
      mimeType: photo.mimeType ?? 'application/octet-stream',
    };
  }

  async exportInvoicePdf(id: string, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    if (!['service_adviser', 'super_admin'].includes(actorInfo.role)) {
      throw new ForbiddenException('Only service advisers or super admins can export service invoices');
    }

    const jobOrder = await this.jobOrdersRepository.findById(id);
    if (actorInfo.role === 'service_adviser' && actorInfo.userId !== jobOrder.serviceAdviserUserId) {
      throw new ForbiddenException('Service advisers can only export invoices for their own job orders');
    }

    if (!this.invoicePdfService) {
      throw new ConflictException('Invoice PDF generation is not configured');
    }

    const artifact = await this.generateInvoiceArtifacts(jobOrder, { attemptEmail: false });
    return {
      buffer: artifact.buffer,
      fileName: artifact.fileName,
    };
  }

  async recordInvoicePayment(id: string, payload: RecordJobOrderInvoicePaymentDto, actor: JobOrderActor) {
    const resolvedActor = await this.assertStaffActor(actor.userId);
    const jobOrder = await this.jobOrdersRepository.findById(id);
    const actorInfo = {
      userId: resolvedActor.id,
      role: resolvedActor.role as JobOrderActorRole,
    };

    if (!['service_adviser', 'super_admin'].includes(actorInfo.role)) {
      throw new ForbiddenException('Only service advisers or super admins can record service invoice payments');
    }

    if (actorInfo.role === 'service_adviser' && actorInfo.userId !== jobOrder.serviceAdviserUserId) {
      throw new ForbiddenException('Service advisers can only record payments for their own job orders');
    }

    if (jobOrder.status !== 'finalized') {
      throw new ConflictException('Only finalized job orders can record invoice payments');
    }

    if (!jobOrder.invoiceRecord) {
      throw new ConflictException('Finalize the job order before recording invoice payment');
    }

    if (jobOrder.invoiceRecord.paymentStatus === 'paid') {
      throw new ConflictException('This service invoice is already marked as paid');
    }

    const paidAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
    const updatedJobOrder = await this.jobOrdersRepository.recordInvoicePayment(id, {
      ...payload,
      recordedByUserId: actorInfo.userId,
      receivedAt: paidAt,
    });
    const serviceAccrualMetadata = await this.resolveServiceAccrualMetadata(updatedJobOrder);

    this.eventBus.publish('service.payment_recorded', {
      jobOrderId: updatedJobOrder.id,
      invoiceRecordId: updatedJobOrder.invoiceRecord.id,
      invoiceReference: updatedJobOrder.invoiceRecord.invoiceReference,
      customerUserId: updatedJobOrder.customerUserId,
      vehicleId: updatedJobOrder.vehicleId,
      serviceAdviserUserId: updatedJobOrder.serviceAdviserUserId,
      serviceAdviserCode: updatedJobOrder.serviceAdviserCode,
      recordedByUserId: actorInfo.userId,
      sourceType: updatedJobOrder.sourceType,
      sourceId: updatedJobOrder.sourceId,
      amountPaidCents: updatedJobOrder.invoiceRecord.amountPaidCents ?? payload.amountPaidCents,
      currencyCode: 'PHP',
      paidAt: (updatedJobOrder.invoiceRecord.paidAt ?? paidAt).toISOString(),
      settlementStatus: 'paid',
      paymentMethod: updatedJobOrder.invoiceRecord.paymentMethod ?? payload.paymentMethod,
      paymentReference: updatedJobOrder.invoiceRecord.paymentReference ?? payload.reference ?? null,
      serviceTypeCode: serviceAccrualMetadata.serviceTypeCode,
      serviceCategoryCode: serviceAccrualMetadata.serviceCategoryCode,
    });

    return updatedJobOrder;
  }

  private async assertSource(payload: CreateJobOrderDto) {
    if (payload.sourceType === 'back_job') {
      const backJob = await this.backJobsRepository.findOptionalById(payload.sourceId);
      if (!backJob) {
        throw new NotFoundException('Back-job source not found');
      }

      if (backJob.status !== 'approved_for_rework') {
        throw new ConflictException('Only approved back jobs can create rework job orders');
      }

      if (backJob.reworkJobOrderId) {
        throw new ConflictException('A rework job order already exists for this back-job case');
      }

      if (await this.jobOrdersRepository.hasBackJobSource(payload.sourceId)) {
        throw new ConflictException('A job order already exists for this back-job case');
      }

      if (backJob.customerUserId !== payload.customerUserId || backJob.vehicleId !== payload.vehicleId) {
        throw new ConflictException('Back-job source does not match the submitted customer or vehicle');
      }

      return {
        jobType: 'back_job' as const,
        parentJobOrderId: backJob.originalJobOrderId,
      };
    }

    const booking = await this.bookingsRepository.findOptionalById(payload.sourceId);
    if (!booking) {
      throw new NotFoundException('Booking source not found');
    }

    if (!['confirmed', 'in_service'].includes(booking.status)) {
      throw new ConflictException('Job orders can only be created from confirmed or workshop-handoff bookings');
    }

    if (await this.jobOrdersRepository.hasBookingSource(payload.sourceId)) {
      throw new ConflictException('A job order already exists for this booking');
    }

    if (booking.userId !== payload.customerUserId || booking.vehicleId !== payload.vehicleId) {
      throw new ConflictException('Job order source does not match the submitted customer or vehicle');
    }

    return {
      jobType: 'normal' as const,
      parentJobOrderId: null,
    };
  }

  private async assertCustomerAndVehicle(payload: CreateJobOrderDto) {
    const customer = await this.usersService.findById(payload.customerUserId);
    if (!customer || !customer.isActive || customer.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    const vehicle = await this.vehiclesRepository.findOwnedByUser(payload.vehicleId, payload.customerUserId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found for customer');
    }

    return { customer, vehicle };
  }

  private async assertServiceAdviserSnapshot(payload: CreateJobOrderDto, actor: JobOrderActor) {
    const serviceAdviser = await this.usersService.findById(payload.serviceAdviserUserId);
    if (!serviceAdviser || !serviceAdviser.isActive) {
      throw new NotFoundException('Service adviser not found');
    }

    if (!['service_adviser', 'super_admin'].includes(serviceAdviser.role)) {
      throw new BadRequestException('Service adviser snapshot must point to a staff adviser account');
    }

    if (!serviceAdviser.staffCode || serviceAdviser.staffCode !== payload.serviceAdviserCode) {
      throw new ConflictException('Service adviser code does not match the selected staff account');
    }

    if (actor.role === 'service_adviser' && actor.userId !== payload.serviceAdviserUserId) {
      throw new ForbiddenException('Service advisers can only create job orders under their own identity');
    }
  }

  private async assertTechnicians(assignedTechnicianIds?: string[]) {
    const normalizedTechnicianIds = this.normalizeTechnicianIds(assignedTechnicianIds);
    if (normalizedTechnicianIds.length === 0) {
      return;
    }

    for (const technicianUserId of normalizedTechnicianIds) {
      const technician = await this.usersService.findById(technicianUserId);
      if (!technician || !technician.isActive) {
        throw new NotFoundException('Assigned technician not found');
      }

      if (technician.role !== 'technician') {
        throw new BadRequestException('Assigned staff must be technician accounts');
      }
    }
  }

  private normalizeTechnicianIds(assignedTechnicianIds?: string[]) {
    return [...new Set((assignedTechnicianIds ?? []).filter(Boolean))];
  }

  private resolveWorkbenchStatuses(scope?: JobOrderWorkbenchScope) {
    if (scope === 'history') {
      return historyWorkbenchStatuses;
    }

    if (scope === 'all') {
      return undefined;
    }

    return activeWorkbenchStatuses;
  }

  private async syncBookingLifecycleForJobOrderHandoff(bookingId: string) {
    const booking = await this.bookingsRepository.findOptionalById(bookingId);
    if (!booking || !['confirmed', 'rescheduled'].includes(booking.status)) {
      return;
    }

    await this.bookingsRepository.updateStatus(bookingId, {
      status: 'in_service',
      reason: 'Booking handed off to the workshop through job-order creation.',
      changedByUserId: null,
    });
  }

  private async syncBookingLifecycleForCompletion(bookingId: string) {
    const booking = await this.bookingsRepository.findOptionalById(bookingId);
    if (!booking || ['completed', 'cancelled', 'declined'].includes(booking.status)) {
      return;
    }

    await this.bookingsRepository.updateStatus(bookingId, {
      status: 'completed',
      reason: 'Booking completed after the linked job order was finalized.',
      changedByUserId: null,
    });
  }

  private async syncBackJobLifecycleForCompletion(backJobId: string) {
    const backJob = await this.backJobsRepository.findOptionalById(backJobId);
    if (!backJob || ['resolved', 'closed', 'rejected'].includes(backJob.status)) {
      return;
    }

    if (!backJob.reworkJobOrderId) {
      return;
    }

    await this.backJobsRepository.updateStatus(backJobId, {
      status: 'resolved',
      resolutionNotes: backJob.resolutionNotes ?? 'Linked rework job order finalized and ready for closure review.',
    });
  }

  private async resolveValidTechnicianIds(assignedTechnicianIds?: string[]) {
    const normalizedTechnicianIds = this.normalizeTechnicianIds(assignedTechnicianIds);
    const validTechnicianIds: string[] = [];

    for (const technicianUserId of normalizedTechnicianIds) {
      const technician = await this.usersService.findById(technicianUserId);
      if (technician?.isActive && technician.role === 'technician') {
        validTechnicianIds.push(technicianUserId);
      }
    }

    return validTechnicianIds;
  }

  private appendAssignmentRepairNote(existingNotes?: string | null) {
    const repairNote = '[assignment-repair] Technician assignment missing. Reassign before resuming execution.';
    if (!existingNotes) {
      return repairNote;
    }

    if (existingNotes.includes(repairNote)) {
      return existingNotes;
    }

    return `${existingNotes}\n${repairNote}`;
  }

  private assertViewerCanAccess(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    actor: JobOrderActor,
  ) {
    if (['head_technician', 'service_adviser', 'super_admin'].includes(actor.role)) {
      return;
    }

    const assignments = jobOrder.assignments as Array<{ technicianUserId: string }>;
    const isAssignedTechnician = assignments.some(
      (assignment) => assignment.technicianUserId === actor.userId,
    );

    if (!isAssignedTechnician) {
      throw new ForbiddenException('Only assigned technicians can access this job order');
    }
  }

  private assertJobOrderCanAcceptEvidence(status: JobOrderStatus) {
    if (['cancelled', 'finalized'].includes(status)) {
      throw new ConflictException('Cancelled or finalized job orders cannot accept progress or photo evidence');
    }
  }

  private generateInvoiceReference(jobOrderId: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-JO-${compactDate}-${jobOrderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  private generateOfficialReceiptReference(jobOrderId: string) {
    const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `OR-${compactDate}-${jobOrderId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
  }

  private normalizePesoAmountToCents(amountPaid?: number) {
    if (!Number.isFinite(amountPaid) || (amountPaid ?? 0) <= 0) {
      return 0;
    }

    return Math.round((amountPaid ?? 0) * 100);
  }

  private buildSuggestedSummary(jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>) {
    const completedItems = (jobOrder.items as Array<{
      name: string;
      description?: string | null;
      isCompleted?: boolean | null;
    }>).filter((item) => item.isCompleted);
    if (completedItems.length === 0) {
      return '';
    }

    return completedItems
      .map((item) => item.description?.trim() || item.name.trim())
      .filter(Boolean)
      .join(' ');
  }

  private formatCurrency(amountCents?: number | null) {
    return `PHP ${((amountCents ?? 0) / 100).toFixed(2)}`;
  }

  private formatPaymentMethodLabel(paymentMethod?: string | null) {
    switch (paymentMethod) {
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'check':
        return 'Check';
      case 'other':
        return 'Other';
      case 'cash':
        return 'Cash';
      default:
        return 'Pending payment';
    }
  }

  private async generateInvoiceArtifacts(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    options: { attemptEmail: boolean },
  ) {
    const invoiceRecord = jobOrder.invoiceRecord;
    if (!invoiceRecord) {
      throw new ConflictException('Invoice-ready record has not been generated for this job order');
    }

    if (!this.invoicePdfService) {
      throw new ConflictException('Invoice PDF generation is not configured');
    }

    const customer = await this.usersService.findById(jobOrder.customerUserId);
    const vehicle = await this.vehiclesRepository.findById(jobOrder.vehicleId);
    const pdfBuffer = await this.invoicePdfService.renderInvoice({
      serviceCenterName: 'Cruisers Crib Auto Care Center',
      customerName: customer
        ? `${customer.profile.firstName} ${customer.profile.lastName}`.trim()
        : 'Unknown customer',
      customerContact: customer?.email || customer?.profile.phone || 'No contact on file',
      vehicleLabel: vehicle
        ? `${vehicle.year ?? 'Vehicle'} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()
        : 'Unknown vehicle',
      jobOrderReference: jobOrder.id,
      invoiceReference: invoiceRecord.invoiceReference,
      officialReceiptReference: invoiceRecord.officialReceiptReference,
      serviceDate: (invoiceRecord.createdAt ?? new Date()).toISOString(),
      summary:
        invoiceRecord.summary ??
        (this.buildSuggestedSummary(jobOrder) || 'No work summary supplied.'),
      workItems: (jobOrder.items as Array<{ name: string; description?: string | null }>).map((item) => ({
        name: item.name,
        description: item.description ?? null,
      })),
      paymentMethodLabel: this.formatPaymentMethodLabel(invoiceRecord.paymentMethod),
      paymentReference: invoiceRecord.paymentReference ?? null,
      reservationFeeDeductionLabel: this.formatCurrency(invoiceRecord.reservationFeeDeductionCents),
      subtotalLabel: this.formatCurrency(invoiceRecord.subtotalAmountCents),
      totalLabel: this.formatCurrency(invoiceRecord.totalAmountCents),
    });

    await this.jobOrdersRepository.updateInvoiceRecord(jobOrder.id, {
      pdfGeneratedAt: new Date(),
      pdfEmailError: null,
    });

    const fileName = `${invoiceRecord.invoiceReference}.pdf`;

    if (options.attemptEmail) {
      if (customer?.email) {
        try {
          await this.smtpMailService.sendMail({
            to: customer.email,
            subject: `AUTOCARE invoice ${invoiceRecord.invoiceReference}`,
            text: `Attached is your service invoice ${invoiceRecord.invoiceReference}.`,
            attachments: [
              {
                filename: fileName,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });

          await this.jobOrdersRepository.updateInvoiceRecord(jobOrder.id, {
            pdfEmailSentAt: new Date(),
            pdfEmailError: null,
          });
        } catch (error) {
          await this.jobOrdersRepository.updateInvoiceRecord(jobOrder.id, {
            pdfEmailError:
              error instanceof Error ? error.message : 'Invoice email delivery failed.',
          });
        }
      } else {
        await this.jobOrdersRepository.updateInvoiceRecord(jobOrder.id, {
          pdfEmailError: 'Customer email is missing; invoice email was not sent.',
        });
      }
    }

    return {
      buffer: pdfBuffer,
      fileName,
    };
  }

  private async resolveServiceAccrualMetadata(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
  ) {
    if (jobOrder.sourceType !== 'booking') {
      return {
        serviceTypeCode: null,
        serviceCategoryCode: null,
      };
    }

    const booking = await this.bookingsRepository.findOptionalById(jobOrder.sourceId);
    const firstRequestedService = booking?.requestedServices?.[0]?.service;

    return {
      serviceTypeCode: firstRequestedService?.id ?? null,
      serviceCategoryCode: firstRequestedService?.categoryId ?? null,
    };
  }

  private async assertStaffActor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Job-order operator not found');
    }

    if (!['technician', 'head_technician', 'service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only staff accounts can manage job orders');
    }

    return user;
  }

  private async assertCustomerReadableActor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Job-order operator not found');
    }

    if (!['customer', 'technician', 'head_technician', 'service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only authorized accounts can access customer service history');
    }

    return user;
  }

  private async assertCanAccessCustomerHistory(
    customerUserId: string,
    actor: { userId: string; role: CustomerReadableActorRole },
  ) {
    const customer = await this.usersService.findById(customerUserId);
    if (!customer || !customer.isActive || customer.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    if (actor.role === 'customer' && actor.userId !== customer.id) {
      throw new ForbiddenException('Customers can only access their own service history');
    }
  }
}
