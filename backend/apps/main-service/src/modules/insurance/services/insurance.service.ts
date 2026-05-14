import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import { createNotificationTrigger } from '@shared/events/contracts/notification-triggers';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { ListInsuranceInquiriesQueryDto } from '../dto/list-insurance-inquiries-query.dto';
import { UploadInsuranceDocumentDto } from '../dto/upload-insurance-document.dto';
import { UpdateInsuranceInquiryWorkflowDto } from '../dto/update-insurance-inquiry-workflow.dto';
import { UpdateInsuranceInquiryStatusDto } from '../dto/update-insurance-inquiry-status.dto';
import { InsuranceRepository } from '../repositories/insurance.repository';
import { insuranceInquiryStatusEnum } from '../schemas/insurance.schema';
import { InsuranceDocumentStorageService } from './insurance-document-storage.service';

type InsuranceActor = {
  userId: string;
  role: string;
};

export type InsuranceUploadFile = {
  originalname: string;
  mimetype?: string;
  buffer: Buffer;
};

type InsuranceInquiryStatus = (typeof insuranceInquiryStatusEnum.enumValues)[number];
type InsuranceNotificationStatus =
  | 'submitted'
  | 'needs_documents'
  | 'under_review'
  | 'rejected'
  | 'closed';

const allowedStatusTransitions: Record<InsuranceInquiryStatus, InsuranceInquiryStatus[]> = {
  submitted: ['needs_documents', 'under_review', 'for_approval', 'approved', 'rejected', 'cancelled'],
  needs_documents: ['under_review', 'for_approval', 'approved', 'rejected', 'cancelled', 'closed'],
  under_review: ['needs_documents', 'for_approval', 'approved', 'rejected', 'cancelled', 'closed'],
  for_approval: ['approved', 'needs_documents', 'rejected', 'cancelled', 'closed'],
  approved: ['payment_pending', 'active', 'for_renewal', 'closed', 'cancelled'],
  payment_pending: ['active', 'for_renewal', 'closed', 'cancelled'],
  active: ['for_renewal', 'closed', 'cancelled'],
  for_renewal: ['active', 'closed', 'cancelled'],
  rejected: ['closed', 'cancelled'],
  cancelled: [],
  closed: [],
};

const notificationEligibleStatuses: InsuranceNotificationStatus[] = [
  'submitted',
  'needs_documents',
  'under_review',
  'rejected',
  'closed',
];

@Injectable()
export class InsuranceService {
  constructor(
    private readonly insuranceRepository: InsuranceRepository,
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
    @Optional() private readonly insuranceDocumentStorage?: InsuranceDocumentStorageService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async create(payload: CreateInsuranceInquiryDto, actor: InsuranceActor) {
    await this.assertActorCanCreate(payload.userId, actor);
    await this.assertCustomerAndVehicle(payload.userId, payload.vehicleId);

    const inquiry = await this.insuranceRepository.create({
      ...payload,
      createdByUserId: actor.userId,
    });

    return {
      ...inquiry,
      purpose: inquiry.purpose ?? payload.purpose ?? 'quotation',
      documentStatus: inquiry.documentStatus ?? 'incomplete',
      paymentStatus: inquiry.paymentStatus ?? 'not_required',
      renewalStatus: inquiry.renewalStatus ?? 'not_applicable',
    };
  }

  async findById(id: string, actor: InsuranceActor) {
    const inquiry = await this.insuranceRepository.findById(id);
    await this.assertCanAccessInquiry(inquiry.userId, actor);
    return inquiry;
  }

  async findByUserId(userId: string, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    return this.insuranceRepository.findByUserId(userId);
  }

  async listForStaff(query: ListInsuranceInquiriesQueryDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    if (typeof this.insuranceRepository.listForStaff === 'function') {
      return this.insuranceRepository.listForStaff(query);
    }

    const inquiries = await this.insuranceRepository.listForAnalytics();
    const filteredInquiries = inquiries.filter((inquiry) => {
      if (query.status && inquiry.status !== query.status) {
        return false;
      }

      if (query.paymentStatus && inquiry.paymentStatus !== query.paymentStatus) {
        return false;
      }

      if (query.renewalStatus && inquiry.renewalStatus !== query.renewalStatus) {
        return false;
      }

      return true;
    });

    return Promise.all(
      filteredInquiries.map(async (inquiry) => {
        const [user, vehicle] = await Promise.all([
          this.usersService.findById(inquiry.userId),
          this.vehiclesService.findById(inquiry.vehicleId),
        ]);

        return {
          ...inquiry,
          customerDisplayName: this.buildCustomerDisplayName(user?.profile),
          vehicleLabel: this.buildVehicleLabel(vehicle),
        };
      }),
    );
  }

  async updateStatus(id: string, payload: UpdateInsuranceInquiryStatusDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    const inquiry = await this.insuranceRepository.findById(id);
    this.assertAllowedWorkflowTransition(inquiry.status, payload.status);

    const updatedInquiry = await this.insuranceRepository.updateStatus(id, {
      ...payload,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    });

    if (payload.status === 'closed') {
      await this.insuranceRepository.upsertRecordFromInquiry({
        inquiryId: updatedInquiry.id,
        userId: updatedInquiry.userId,
        vehicleId: updatedInquiry.vehicleId,
        inquiryType: updatedInquiry.inquiryType,
        providerName: updatedInquiry.providerName,
        policyNumber: updatedInquiry.policyNumber,
        status: payload.status,
      });
    }

    if (notificationEligibleStatuses.includes(updatedInquiry.status as InsuranceNotificationStatus)) {
      await this.notificationsService?.applyTrigger(
        createNotificationTrigger('insurance.inquiry_status_changed', 'main-service.insurance', {
          inquiryId: updatedInquiry.id,
          userId: updatedInquiry.userId,
          status: updatedInquiry.status as InsuranceNotificationStatus,
          subject: updatedInquiry.subject,
        }),
      );
    }

    return updatedInquiry;
  }

  async updateWorkflow(id: string, payload: UpdateInsuranceInquiryWorkflowDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    const inquiry = await this.insuranceRepository.findById(id);
    this.assertAllowedWorkflowTransition(inquiry.status, payload.status);

    return this.insuranceRepository.updateWorkflow(id, {
      status: payload.status,
      ...(payload.documentStatus !== undefined ? { documentStatus: payload.documentStatus } : {}),
      ...(payload.paymentStatus !== undefined ? { paymentStatus: payload.paymentStatus } : {}),
      ...(payload.renewalStatus !== undefined ? { renewalStatus: payload.renewalStatus } : {}),
      ...(payload.paymentDueAt !== undefined ? { paymentDueAt: new Date(payload.paymentDueAt) } : {}),
      ...(payload.policyExpiryAt !== undefined ? { policyExpiryAt: new Date(payload.policyExpiryAt) } : {}),
      ...(payload.renewalDueAt !== undefined ? { renewalDueAt: new Date(payload.renewalDueAt) } : {}),
      ...(payload.assignedStaffId !== undefined ? { assignedStaffId: payload.assignedStaffId } : {}),
      ...(payload.reviewNotes !== undefined ? { reviewNotes: payload.reviewNotes } : {}),
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    });
  }

  async addDocument(id: string, payload: AddInsuranceDocumentDto, actor: InsuranceActor) {
    const inquiry = await this.insuranceRepository.findById(id);
    await this.assertCanAccessInquiry(inquiry.userId, actor);

    if (['closed', 'rejected'].includes(inquiry.status)) {
      throw new ConflictException('Closed or rejected insurance inquiries cannot accept new documents');
    }

    return this.insuranceRepository.addDocument(id, payload, actor.userId);
  }

  async uploadDocument(
    id: string,
    payload: UploadInsuranceDocumentDto,
    file: InsuranceUploadFile | undefined,
    actor: InsuranceActor,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Insurance document file is required');
    }

    const inquiry = await this.insuranceRepository.findById(id);
    await this.assertCanAccessInquiry(inquiry.userId, actor);

    if (['closed', 'rejected'].includes(inquiry.status)) {
      throw new ConflictException('Closed or rejected insurance inquiries cannot accept new documents');
    }

    const savedDocument = await this.getInsuranceDocumentStorage().saveDocument({
      inquiryId: id,
      mimeType: file.mimetype,
      originalName: file.originalname,
      buffer: file.buffer,
    });

    try {
      return await this.insuranceRepository.addUploadedDocument(id, {
        document: {
          fileName: file.originalname,
          fileUrl: savedDocument.fileUrl,
          documentType: payload.documentType,
          notes: payload.notes,
        },
        activity: {
          action: 'document_uploaded',
          actorUserId: actor.userId,
          documentType: payload.documentType,
          notes: payload.notes ?? null,
        },
        uploadedByUserId: actor.userId,
      });
    } catch (error) {
      await this.getInsuranceDocumentStorage().deleteDocument(savedDocument.storageKey);
      throw error;
    }
  }

  async findRecordsByVehicleId(vehicleId: string, actor: InsuranceActor) {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    await this.assertCanAccessVehicleRecords(vehicle.userId, actor);
    return this.insuranceRepository.findRecordsByVehicleId(vehicleId);
  }

  private async assertActorCanCreate(customerUserId: string, actor: InsuranceActor) {
    if (actor.role === 'customer') {
      if (actor.userId !== customerUserId) {
        throw new ForbiddenException('Customers can only create insurance inquiries for their own account');
      }

      return;
    }

    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only customers, service advisers, or super admins can create inquiries');
    }
  }

  private async assertCustomerAndVehicle(userId: string, vehicleId: string) {
    const [user, vehicle] = await Promise.all([
      this.usersService.findById(userId),
      this.vehiclesService.findById(vehicleId),
    ]);

    if (!user || !user.isActive || user.role !== 'customer') {
      throw new NotFoundException('Customer not found');
    }

    if (vehicle.userId !== userId) {
      throw new ConflictException('Vehicle does not belong to the submitted customer');
    }
  }

  private async assertCanAccessInquiry(ownerUserId: string, actor: InsuranceActor) {
    if (actor.role === 'customer') {
      if (actor.userId !== ownerUserId) {
        throw new ForbiddenException('Customers can only access their own insurance inquiries');
      }

      return;
    }

    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can access this insurance inquiry');
    }
  }

  private async assertCanAccessVehicleRecords(ownerUserId: string, actor: InsuranceActor) {
    if (actor.role === 'customer') {
      if (actor.userId !== ownerUserId) {
        throw new ForbiddenException('Customers can only access insurance records for their own vehicle');
      }

      return;
    }

    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can access vehicle insurance records');
    }
  }

  private async assertStaffReviewer(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Insurance reviewer not found');
    }

    if (!['service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only service advisers or super admins can review insurance inquiries');
    }

    return user;
  }

  private getInsuranceDocumentStorage() {
    return this.insuranceDocumentStorage ?? new InsuranceDocumentStorageService();
  }

  private buildCustomerDisplayName(
    profile:
      | {
          firstName: string;
          lastName: string;
        }
      | {
          firstName: string;
          lastName: string;
        }[]
      | null
      | undefined,
  ) {
    const resolvedProfile = Array.isArray(profile) ? profile[0] ?? null : profile;

    if (!resolvedProfile) {
      return 'Unknown customer';
    }

    return `${resolvedProfile.firstName} ${resolvedProfile.lastName}`.trim();
  }

  private buildVehicleLabel(
    vehicle:
      | {
          make: string;
          model: string;
          plateNumber: string;
        }
      | null
      | undefined,
  ) {
    if (!vehicle) {
      return 'Unknown vehicle';
    }

    return `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})`;
  }

  private assertAllowedWorkflowTransition(
    currentStatus: InsuranceInquiryStatus,
    nextStatus: InsuranceInquiryStatus,
  ) {
    if (currentStatus === nextStatus) {
      throw new BadRequestException('Insurance inquiry is already in the requested status');
    }

    if (!allowedStatusTransitions[currentStatus].includes(nextStatus)) {
      throw new ConflictException(
        `Cannot transition insurance inquiry from ${currentStatus} to ${nextStatus}`,
      );
    }
  }
}
