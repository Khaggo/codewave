import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';

import { AddJobOrderPhotoDto } from '../dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../dto/add-job-order-progress.dto';
import { CreateJobOrderDto } from '../dto/create-job-order.dto';
import { FinalizeJobOrderDto } from '../dto/finalize-job-order.dto';
import { ListJobOrderWorkbenchQueryDto } from '../dto/list-job-order-workbench-query.dto';
import { RecordJobOrderInvoicePaymentDto } from '../dto/record-job-order-invoice-payment.dto';
import { UpdateJobOrderStatusDto } from '../dto/update-job-order-status.dto';
import { JobOrdersRepository } from '../repositories/job-orders.repository';
import { jobOrderStatusEnum } from '../schemas/job-orders.schema';

type JobOrderActorRole = 'technician' | 'service_adviser' | 'super_admin';
type JobOrderActor = {
  userId: string;
  role: string;
};
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
    if (month) {
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

    const finalizedJobOrder = await this.jobOrdersRepository.finalize(id, {
      ...payload,
      finalizedByUserId: actorInfo.userId,
      invoiceReference: this.generateInvoiceReference(jobOrder.id),
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

    return finalizedJobOrder;
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

    if (booking.status !== 'confirmed') {
      throw new ConflictException('Job orders can only be created from confirmed bookings');
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
    if (!assignedTechnicianIds?.length) {
      return;
    }

    for (const technicianUserId of assignedTechnicianIds) {
      const technician = await this.usersService.findById(technicianUserId);
      if (!technician || !technician.isActive) {
        throw new NotFoundException('Assigned technician not found');
      }

      if (technician.role !== 'technician') {
        throw new BadRequestException('Assigned staff must be technician accounts');
      }
    }
  }

  private assertViewerCanAccess(
    jobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    actor: JobOrderActor,
  ) {
    if (['service_adviser', 'super_admin'].includes(actor.role)) {
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

    if (!['technician', 'service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only staff accounts can manage job orders');
    }

    return user;
  }
}
