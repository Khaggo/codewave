import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

import { CreateBackJobDto } from '../dto/create-back-job.dto';
import { UpdateBackJobStatusDto } from '../dto/update-back-job-status.dto';
import { BackJobsRepository } from '../repositories/back-jobs.repository';
import { backJobStatusEnum } from '../schemas/back-jobs.schema';

type BackJobActor = {
  userId: string;
  role: string;
};

type BackJobStatus = (typeof backJobStatusEnum.enumValues)[number];

const allowedStatusTransitions: Record<BackJobStatus, BackJobStatus[]> = {
  reported: ['inspected', 'rejected', 'closed'],
  inspected: ['approved_for_rework', 'rejected', 'closed'],
  approved_for_rework: ['in_progress', 'rejected', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
  rejected: ['closed'],
};

@Injectable()
export class BackJobsService {
  constructor(
    private readonly backJobsRepository: BackJobsRepository,
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly jobOrdersRepository: JobOrdersRepository,
  ) {}

  async create(payload: CreateBackJobDto, actor: BackJobActor) {
    const resolvedActor = await this.assertStaffReviewer(actor.userId);

    await this.assertCustomerAndVehicle(payload.customerUserId, payload.vehicleId);

    const originalJobOrder = await this.jobOrdersRepository.findById(payload.originalJobOrderId);
    this.assertOriginalJobOrderLineage(originalJobOrder, payload);

    if (payload.returnInspectionId) {
      await this.assertReturnInspection(payload.vehicleId, payload.returnInspectionId);
    }

    return this.backJobsRepository.create({
      ...payload,
      createdByUserId: resolvedActor.id,
    });
  }

  async findById(id: string, actor: BackJobActor) {
    const backJob = await this.backJobsRepository.findById(id);
    await this.assertViewerCanAccess(backJob, actor);
    return backJob;
  }

  async findByVehicleId(vehicleId: string, actor: BackJobActor) {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    await this.assertVehicleViewerCanAccess(vehicle.userId, actor);
    return this.backJobsRepository.findByVehicleId(vehicleId);
  }

  async updateStatus(id: string, payload: UpdateBackJobStatusDto, actor: BackJobActor) {
    await this.assertStaffReviewer(actor.userId);
    const backJob = await this.backJobsRepository.findById(id);

    if (backJob.status === payload.status) {
      throw new BadRequestException('Back job is already in the requested status');
    }

    if (!allowedStatusTransitions[backJob.status].includes(payload.status)) {
      throw new ConflictException(`Cannot transition back job from ${backJob.status} to ${payload.status}`);
    }

    const resolvedInspectionId = payload.returnInspectionId ?? backJob.returnInspectionId ?? null;
    if (['inspected', 'approved_for_rework'].includes(payload.status)) {
      if (!resolvedInspectionId) {
        throw new ConflictException('Return inspection evidence is required before review approval');
      }

      const inspection = await this.assertReturnInspection(backJob.vehicleId, resolvedInspectionId);
      const hasEvidence = backJob.findings.length > 0 || inspection.findings.length > 0;

      if (!hasEvidence) {
        throw new ConflictException('Validated back-job review requires findings from the case or return inspection');
      }
    }

    if (payload.status === 'in_progress' && !backJob.reworkJobOrderId) {
      throw new ConflictException('Back jobs can only move to in-progress after a rework job order is linked');
    }

    if (payload.status === 'resolved' && !backJob.reworkJobOrderId) {
      throw new ConflictException('Resolved back jobs must link to a rework job order');
    }

    return this.backJobsRepository.updateStatus(id, payload);
  }

  private async assertCustomerAndVehicle(customerUserId: string, vehicleId: string) {
    const [customer, vehicle] = await Promise.all([
      this.usersService.findById(customerUserId),
      this.vehiclesService.findById(vehicleId),
    ]);

    if (!customer || !customer.isActive || customer.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    if (vehicle.userId !== customerUserId) {
      throw new ConflictException('Vehicle does not belong to the submitted customer');
    }
  }

  private assertOriginalJobOrderLineage(
    originalJobOrder: Awaited<ReturnType<JobOrdersRepository['findById']>>,
    payload: CreateBackJobDto,
  ) {
    if (originalJobOrder.status !== 'finalized') {
      throw new ConflictException('Only finalized job orders can be reviewed as back-job lineage');
    }

    if (originalJobOrder.customerUserId !== payload.customerUserId || originalJobOrder.vehicleId !== payload.vehicleId) {
      throw new ConflictException('Original job-order lineage does not match the submitted customer or vehicle');
    }

    if (payload.originalBookingId) {
      if (originalJobOrder.sourceType !== 'booking' || originalJobOrder.sourceId !== payload.originalBookingId) {
        throw new ConflictException('Original booking reference does not match the linked job order');
      }
    }
  }

  private async assertReturnInspection(vehicleId: string, inspectionId: string) {
    const inspection = await this.inspectionsRepository.findById(inspectionId);

    if (inspection.vehicleId !== vehicleId) {
      throw new ConflictException('Return inspection does not belong to the submitted vehicle');
    }

    if (inspection.inspectionType !== 'return') {
      throw new ConflictException('Back-job review requires a return inspection reference');
    }

    return inspection;
  }

  private async assertViewerCanAccess(
    backJob: Awaited<ReturnType<BackJobsRepository['findById']>>,
    actor: BackJobActor,
  ) {
    if (['service_adviser', 'super_admin'].includes(actor.role)) {
      return;
    }

    if (actor.role === 'customer' && backJob.customerUserId === actor.userId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this back-job case');
  }

  private async assertVehicleViewerCanAccess(vehicleOwnerUserId: string, actor: BackJobActor) {
    if (['service_adviser', 'super_admin'].includes(actor.role)) {
      return;
    }

    if (actor.role === 'customer' && vehicleOwnerUserId === actor.userId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this vehicle back-job history');
  }

  private async assertStaffReviewer(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Back-job reviewer not found');
    }

    if (!['service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only service advisers or super admins can review back jobs');
    }

    return user;
  }
}
