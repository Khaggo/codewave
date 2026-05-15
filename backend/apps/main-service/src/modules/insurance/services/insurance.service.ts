import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import {
  createNotificationTrigger,
  type InsuranceCustomerReminderState,
} from '@shared/events/contracts/notification-triggers';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { CreateRenewalFollowUpDto } from '../dto/create-renewal-follow-up.dto';
import { ListInsuranceInquiriesQueryDto } from '../dto/list-insurance-inquiries-query.dto';
import { SendInsuranceBroadcastsDto } from '../dto/send-insurance-broadcasts.dto';
import {
  type InsuranceManualReminderType,
  type InsuranceReminderTargetMode,
  type SendInsuranceRemindersDto,
} from '../dto/send-insurance-reminders.dto';
import { UploadInsuranceDocumentDto } from '../dto/upload-insurance-document.dto';
import { UpdateInsuranceInquiryWorkflowDto } from '../dto/update-insurance-inquiry-workflow.dto';
import { UpdateInsuranceInquiryStatusDto } from '../dto/update-insurance-inquiry-status.dto';
import { InsuranceRepository } from '../repositories/insurance.repository';
import {
  insuranceInquiryStatusEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
} from '../schemas/insurance.schema';
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
type InsurancePaymentStatus = (typeof insurancePaymentStatusEnum.enumValues)[number];
type InsuranceRenewalStatus = (typeof insuranceRenewalStatusEnum.enumValues)[number];
type InsuranceWorkflowUpdatePayload = Parameters<InsuranceRepository['updateWorkflow']>[1];
type PaymentActivityAction =
  | 'payment_marked_paid'
  | 'payment_marked_overdue'
  | 'payment_verification_started'
  | 'payment_due_date_updated';
type RenewalActivityAction =
  | 'renewal_follow_up_created'
  | 'renewal_quote_preparing'
  | 'renewal_quoted'
  | 'renewal_awaiting_customer'
  | 'renewal_renewed'
  | 'renewal_expired'
  | 'renewal_cancelled';

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

type InsuranceReminderSourceState = {
  id: string;
  userId: string;
  status: InsuranceInquiryStatus;
  paymentStatus: InsurancePaymentStatus;
  renewalStatus: InsuranceRenewalStatus;
  subject: string;
  updatedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
};

type ReminderTargetInquiry = {
  id: string;
  userId: string;
  status: InsuranceInquiryStatus;
  documentStatus?: string | null;
  paymentStatus: InsurancePaymentStatus;
  renewalStatus: InsuranceRenewalStatus;
  paymentDueAt?: Date | string | null;
  subject: string;
};

type ManualReminderResult = {
  inquiryId: string;
  reminderType: InsuranceManualReminderType;
  result: 'sent' | 'skipped' | 'failed';
  reason?: 'case_not_reminder_eligible' | 'notification_send_failed';
};

type ManualBroadcastResult = {
  inquiryId: string;
  customerId: string | null;
  status: 'sent' | 'skipped' | 'failed';
  reason: 'case_not_broadcast_eligible' | 'notification_send_failed' | 'activity_log_failed' | null;
};

const reminderFilterKeys = ['purpose', 'status', 'paymentStatus', 'renewalStatus'] as const;

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

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

    return this.presentInquiryForActor(
      {
        ...inquiry,
        purpose: inquiry.purpose ?? payload.purpose ?? 'quotation',
        documentStatus: inquiry.documentStatus ?? 'incomplete',
        paymentStatus: inquiry.paymentStatus ?? 'not_required',
        renewalStatus: inquiry.renewalStatus ?? 'not_applicable',
      },
      actor,
    );
  }

  async createRenewalFollowUp(payload: CreateRenewalFollowUpDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);
    await this.assertCustomerAndVehicle(payload.userId, payload.vehicleId);
    await this.assertAssignableStaff(payload.assignedStaffId);

    const activity = {
      action: 'renewal_follow_up_created' as const,
      actorUserId: actor.userId,
      notes: payload.notes ?? null,
    };

    if (typeof this.insuranceRepository.createRenewalFollowUp === 'function') {
      const createdInquiry = await this.insuranceRepository.createRenewalFollowUp(
        {
          ...payload,
          createdByUserId: actor.userId,
        },
        activity,
      );

      const createdReminderState = this.asReminderSourceState(createdInquiry);

      await this.emitCustomerReminderTrigger(
        {
          ...createdReminderState,
          status: 'approved',
        },
        createdReminderState,
      );

      return createdInquiry;
    }

    const createdInquiry = await this.insuranceRepository.create({
      ...payload,
      purpose: 'renewal',
      createdByUserId: actor.userId,
    });

    const updatedInquiry = await this.insuranceRepository.updateWorkflow(
      createdInquiry.id,
      {
        purpose: 'renewal',
        status: 'for_renewal',
        paymentStatus: 'not_required',
        renewalStatus: 'upcoming',
        ...(payload.assignedStaffId !== undefined ? { assignedStaffId: payload.assignedStaffId } : {}),
        ...(payload.policyExpiryAt !== undefined ? { policyExpiryAt: new Date(payload.policyExpiryAt) } : {}),
        renewalDueAt: new Date(payload.renewalDueAt),
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
      } as InsuranceWorkflowUpdatePayload & { purpose: 'renewal' },
      [activity],
      undefined,
    );

    const normalizedInquiry = {
      ...updatedInquiry,
      purpose: updatedInquiry.purpose ?? 'renewal',
      paymentStatus: updatedInquiry.paymentStatus ?? 'not_required',
      renewalStatus: updatedInquiry.renewalStatus ?? 'upcoming',
      renewalDueAt: updatedInquiry.renewalDueAt ?? new Date(payload.renewalDueAt),
    };

    await this.emitCustomerReminderTrigger(
      {
        ...this.asReminderSourceState(normalizedInquiry),
        status: 'approved',
      },
      this.asReminderSourceState(normalizedInquiry),
    );

    return normalizedInquiry;
  }

  async findById(id: string, actor: InsuranceActor) {
    const inquiry = await this.insuranceRepository.findById(id);
    await this.assertCanAccessInquiry(inquiry.userId, actor);
    return this.presentInquiryForActor(inquiry, actor);
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
    }, this.buildCloseRecordUpsert(inquiry, payload.status));

    await this.emitCustomerReminderTrigger(
      this.asReminderSourceState(inquiry),
      this.asReminderSourceState(updatedInquiry),
    );

    return updatedInquiry;
  }

  async updateWorkflow(id: string, payload: UpdateInsuranceInquiryWorkflowDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    const inquiry = await this.insuranceRepository.findById(id);
    if (payload.status !== inquiry.status) {
      this.assertAllowedWorkflowTransition(inquiry.status, payload.status);
    }
    await this.assertAssignableStaff(payload.assignedStaffId);

    const workflowPatch: InsuranceWorkflowUpdatePayload = {
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
    };

    const workflowActivities = this.buildWorkflowActivities(inquiry, payload, actor.userId);
    const updatedInquiry = await this.insuranceRepository.updateWorkflow(
      id,
      workflowPatch,
      workflowActivities,
      this.buildCloseRecordUpsert(inquiry, payload.status),
    );
    await this.emitCustomerReminderTrigger(
      this.asReminderSourceState(inquiry),
      this.asReminderSourceState(updatedInquiry),
    );
    return updatedInquiry;
  }

  async addDocument(id: string, payload: AddInsuranceDocumentDto, actor: InsuranceActor) {
    const inquiry = await this.insuranceRepository.findById(id);
    await this.assertCanAccessInquiry(inquiry.userId, actor);

    if (['closed', 'rejected'].includes(inquiry.status)) {
      throw new ConflictException('Closed or rejected insurance inquiries cannot accept new documents');
    }

    return this.presentInquiryForActor(
      await this.insuranceRepository.addDocument(id, payload, actor.userId),
      actor,
    );
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
      return this.presentInquiryForActor(
        await this.insuranceRepository.addUploadedDocument(id, {
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
        }),
        actor,
      );
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

  async sendManualBroadcasts(payload: SendInsuranceBroadcastsDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    const inquiries = await this.resolveBroadcastTargets(payload);
    const resultsByInquiryId = new Map<string, ManualBroadcastResult>();
    const eligibleInquiries: ReminderTargetInquiry[] = [];
    const inquiriesByCustomerId = new Map<string, ReminderTargetInquiry[]>();
    let successfulCustomerSends = 0;

    for (const inquiry of inquiries) {
      if (!this.isManualBroadcastEligible(inquiry)) {
        resultsByInquiryId.set(inquiry.id, {
          inquiryId: inquiry.id,
          customerId: inquiry.userId ?? null,
          status: 'skipped',
          reason: 'case_not_broadcast_eligible',
        });
        continue;
      }

      eligibleInquiries.push(inquiry);
      const customerInquiries = inquiriesByCustomerId.get(inquiry.userId) ?? [];
      customerInquiries.push(inquiry);
      inquiriesByCustomerId.set(inquiry.userId, customerInquiries);
    }

    for (const customerInquiries of inquiriesByCustomerId.values()) {
      const representativeInquiry = customerInquiries[0];

      try {
        await this.sendManualBroadcastNotification(representativeInquiry, payload.title, payload.message);
        successfulCustomerSends += 1;
      } catch (error) {
        for (const inquiry of customerInquiries) {
          resultsByInquiryId.set(inquiry.id, {
            inquiryId: inquiry.id,
            customerId: inquiry.userId ?? null,
            status: 'failed',
            reason: 'notification_send_failed',
          });
        }

        continue;
      }

      for (const inquiry of customerInquiries) {
        try {
          if (typeof this.insuranceRepository.appendActivity === 'function') {
            await this.insuranceRepository.appendActivity(inquiry.id, {
              action: 'manual_broadcast_sent',
              actorUserId: actor.userId,
              notes: payload.title,
            });
          }

          resultsByInquiryId.set(inquiry.id, {
            inquiryId: inquiry.id,
            customerId: inquiry.userId ?? null,
            status: 'sent',
            reason: null,
          });
        } catch (error) {
          resultsByInquiryId.set(inquiry.id, {
            inquiryId: inquiry.id,
            customerId: inquiry.userId ?? null,
            status: 'failed',
            reason: 'activity_log_failed',
          });
        }
      }
    }

    const results: ManualBroadcastResult[] = inquiries.map((inquiry) => (
      resultsByInquiryId.get(inquiry.id) ?? {
        inquiryId: inquiry.id,
        customerId: inquiry.userId ?? null,
        status: 'skipped' as const,
        reason: 'case_not_broadcast_eligible' as const,
      }
    ));

    return this.buildManualBroadcastSummary(
      inquiries.length,
      eligibleInquiries.length,
      inquiriesByCustomerId.size,
      successfulCustomerSends,
      results,
    );
  }

  async sendManualReminders(payload: SendInsuranceRemindersDto, actor: InsuranceActor) {
    await this.assertStaffReviewer(actor.userId);

    const inquiries = await this.resolveReminderTargets(payload);
    const results: ManualReminderResult[] = [];

    for (const inquiry of inquiries) {
      const eligibility = this.evaluateManualReminderEligibility(inquiry, payload.reminderType);

      if (!eligibility.eligible) {
        results.push({
          inquiryId: inquiry.id,
          reminderType: payload.reminderType,
          result: 'skipped',
          reason: eligibility.reason,
        });
        continue;
      }

      try {
        await this.sendManualReminderNotification(inquiry, payload.reminderType);
        if (typeof this.insuranceRepository.appendActivity === 'function') {
          await this.insuranceRepository.appendActivity(inquiry.id, {
            action: 'manual_reminder_sent',
            actorUserId: actor.userId,
            notes: payload.reminderType,
          });
        }
        results.push({
          inquiryId: inquiry.id,
          reminderType: payload.reminderType,
          result: 'sent',
        });
      } catch (error) {
        results.push({
          inquiryId: inquiry.id,
          reminderType: payload.reminderType,
          result: 'failed',
          reason: 'notification_send_failed',
        });
      }
    }

    return this.buildManualReminderSummary(inquiries.length, results);
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

  private async assertAssignableStaff(assignedStaffId: string | undefined) {
    if (!assignedStaffId) {
      return;
    }

    const user = await this.usersService.findById(assignedStaffId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Assigned staff member not found');
    }

    if (!['service_adviser', 'super_admin'].includes(user.role)) {
      throw new BadRequestException('Assigned staff member must be a service adviser or super admin');
    }
  }

  private getInsuranceDocumentStorage() {
    return this.insuranceDocumentStorage ?? new InsuranceDocumentStorageService();
  }

  private async resolveBroadcastTargets(payload: SendInsuranceBroadcastsDto): Promise<ReminderTargetInquiry[]> {
    if (payload.targetMode === 'filtered_results') {
      if (!this.hasMeaningfulReminderFilters(payload.filters)) {
        throw new BadRequestException('Broadcast filters are required for filtered-results sends');
      }

      const filters = payload.filters as ListInsuranceInquiriesQueryDto;

      if (typeof this.insuranceRepository.listForStaff === 'function') {
        return this.normalizeReminderTargets(await this.insuranceRepository.listForStaff(filters));
      }

      const inquiries = await this.insuranceRepository.listForAnalytics();
      const filteredInquiries = inquiries.filter((inquiry) => {
        if (filters.purpose && inquiry.purpose !== filters.purpose) {
          return false;
        }

        if (filters.status && inquiry.status !== filters.status) {
          return false;
        }

        if (filters.paymentStatus && inquiry.paymentStatus !== filters.paymentStatus) {
          return false;
        }

        if (filters.renewalStatus && inquiry.renewalStatus !== filters.renewalStatus) {
          return false;
        }

        return true;
      });

      return this.normalizeReminderTargets(filteredInquiries);
    }

    if (!payload.selectedIds?.length) {
      throw new BadRequestException('Selected insurance inquiry ids are required for this broadcast send');
    }

    const uniqueSelectedIds = [...new Set(payload.selectedIds)];
    const inquiries = await Promise.all(
      uniqueSelectedIds.map((selectedId) => this.insuranceRepository.findById(selectedId)),
    );

    return this.normalizeReminderTargets(inquiries);
  }

  private isManualBroadcastEligible(inquiry: ReminderTargetInquiry) {
    if (!inquiry.userId) {
      return false;
    }

    return !['closed', 'cancelled', 'rejected'].includes(inquiry.status);
  }

  private async resolveReminderTargets(payload: SendInsuranceRemindersDto): Promise<ReminderTargetInquiry[]> {
    if (payload.targetMode === 'filtered_results') {
      if (!this.hasMeaningfulReminderFilters(payload.filters)) {
        throw new BadRequestException('Reminder filters are required for filtered-results sends');
      }

      const filters = payload.filters as ListInsuranceInquiriesQueryDto;

      if (typeof this.insuranceRepository.listForStaff === 'function') {
        return this.normalizeReminderTargets(await this.insuranceRepository.listForStaff(filters));
      }

      const inquiries = await this.insuranceRepository.listForAnalytics();
      const filteredInquiries = inquiries.filter((inquiry) => {
        if (filters.purpose && inquiry.purpose !== filters.purpose) {
          return false;
        }

        if (filters.status && inquiry.status !== filters.status) {
          return false;
        }

        if (filters.paymentStatus && inquiry.paymentStatus !== filters.paymentStatus) {
          return false;
        }

        if (filters.renewalStatus && inquiry.renewalStatus !== filters.renewalStatus) {
          return false;
        }

        return true;
      });

      return this.normalizeReminderTargets(filteredInquiries);
    }

    if (!payload.selectedIds?.length) {
      throw new BadRequestException('Selected insurance inquiry ids are required for this reminder send');
    }

    if (payload.targetMode === 'single_case' && payload.selectedIds.length !== 1) {
      throw new BadRequestException('Single-case reminders require exactly one selected insurance inquiry id');
    }

    const uniqueSelectedIds = [...new Set(payload.selectedIds)];
    const inquiries = await Promise.all(
      uniqueSelectedIds.map((selectedId) => this.insuranceRepository.findById(selectedId)),
    );

    return this.normalizeReminderTargets(inquiries);
  }

  private hasMeaningfulReminderFilters(filters: ListInsuranceInquiriesQueryDto | undefined) {
    if (!filters) {
      return false;
    }

    return reminderFilterKeys.some((key) => {
      const value = filters[key];
      return value !== undefined && value !== null;
    });
  }

  private normalizeReminderTargets(
    inquiries: Array<{
      id: string;
      userId: string;
      status: string;
      documentStatus?: string | null;
      paymentStatus?: string | null;
      renewalStatus?: string | null;
      paymentDueAt?: Date | string | null;
      subject: string;
    }>,
  ): ReminderTargetInquiry[] {
    return inquiries.map((inquiry) => ({
      id: inquiry.id,
      userId: inquiry.userId,
      status: inquiry.status as InsuranceInquiryStatus,
      documentStatus: inquiry.documentStatus ?? null,
      paymentStatus: (inquiry.paymentStatus ?? 'not_required') as InsurancePaymentStatus,
      renewalStatus: (inquiry.renewalStatus ?? 'not_applicable') as InsuranceRenewalStatus,
      paymentDueAt: inquiry.paymentDueAt ?? null,
      subject: inquiry.subject,
    }));
  }

  private evaluateManualReminderEligibility(
    inquiry: ReminderTargetInquiry,
    reminderType: InsuranceManualReminderType,
  ) {
    if (['closed', 'cancelled', 'rejected'].includes(inquiry.status)) {
      return { eligible: false, reason: 'case_not_reminder_eligible' as const };
    }

    switch (reminderType) {
      case 'missing_documents':
        return {
          eligible: inquiry.status === 'needs_documents' || inquiry.documentStatus === 'incomplete',
          reason: 'case_not_reminder_eligible' as const,
        };
      case 'payment_pending':
        return {
          eligible:
            inquiry.status === 'payment_pending' ||
            ['unpaid', 'proof_submitted', 'verifying'].includes(inquiry.paymentStatus),
          reason: 'case_not_reminder_eligible' as const,
        };
      case 'overdue_payment': {
        const paymentDueAt = inquiry.paymentDueAt;

        return {
          eligible:
            inquiry.paymentStatus === 'overdue' ||
            (paymentDueAt !== null &&
              paymentDueAt !== undefined &&
              new Date(paymentDueAt).getTime() < Date.now() &&
              inquiry.paymentStatus !== 'paid'),
          reason: 'case_not_reminder_eligible' as const,
        };
      }
      case 'renewal_follow_up':
        return {
          eligible:
            inquiry.status === 'for_renewal' ||
            ['upcoming', 'quote_preparing', 'quoted', 'awaiting_customer'].includes(inquiry.renewalStatus),
          reason: 'case_not_reminder_eligible' as const,
        };
    }
  }

  private buildManualReminderSummary(targetedCount: number, results: ManualReminderResult[]) {
    const eligibleCount = results.filter((result) => result.result === 'sent' || result.result === 'failed').length;
    const sentCount = results.filter((result) => result.result === 'sent').length;
    const skippedCount = results.filter((result) => result.result === 'skipped').length;
    const failedCount = results.filter((result) => result.result === 'failed').length;

    return {
      targetedCount,
      eligibleCount,
      sentCount,
      skippedCount,
      failedCount,
      results,
    };
  }

  private buildManualBroadcastSummary(
    targetedCaseCount: number,
    eligibleCaseCount: number,
    deduplicatedCustomerCount: number,
    sentCount: number,
    results: ManualBroadcastResult[],
  ) {
    const skippedCount = results.filter((result) => result.status === 'skipped').length;
    const failedCount = results.filter((result) => result.status === 'failed').length;

    return {
      targetedCaseCount,
      eligibleCaseCount,
      deduplicatedCustomerCount,
      sentCount,
      skippedCount,
      failedCount,
      results,
    };
  }

  private async sendManualBroadcastNotification(
    inquiry: Pick<ReminderTargetInquiry, 'id' | 'userId'>,
    title: string,
    message: string,
  ) {
    if (!this.notificationsService) {
      throw new Error('Notifications service is not configured');
    }

    return this.notificationsService.enqueueNotification({
      userId: inquiry.userId,
      category: 'insurance_update',
      channel: 'in_app',
      sourceType: 'insurance_inquiry',
      sourceId: inquiry.id,
      title,
      message,
      dedupeKey: `notification:insurance.broadcast:${inquiry.id}:${randomUUID()}`,
    });
  }

  private async sendManualReminderNotification(
    inquiry: ReminderTargetInquiry,
    reminderType: InsuranceManualReminderType,
  ) {
    if (!this.notificationsService) {
      throw new Error('Notifications service is not configured');
    }

    const reminderCopyByType: Record<InsuranceManualReminderType, { title: string; message: string }> = {
      missing_documents: {
        title: 'Missing documents',
        message: 'Please upload the required insurance documents so we can continue your request.',
      },
      payment_pending: {
        title: 'Payment pending',
        message: 'Your insurance request now needs payment action.',
      },
      overdue_payment: {
        title: 'Payment overdue',
        message: 'Your insurance request is overdue for payment. Upload proof after payment or contact staff for help.',
      },
      renewal_follow_up: {
        title: 'Renewal follow-up',
        message: 'Your insurance renewal is coming up. Open your insurance request for the next step.',
      },
    };

    const reminderCopy = reminderCopyByType[reminderType];

    return this.notificationsService.enqueueNotification({
      userId: inquiry.userId,
      category: 'insurance_update',
      channel: 'in_app',
      sourceType: 'insurance_inquiry',
      sourceId: inquiry.id,
      title: reminderCopy.title,
      message: reminderCopy.message,
      dedupeKey: `notification:insurance.manual:${inquiry.id}:${reminderType}:${randomUUID()}`,
    });
  }

  private presentInquiryForActor<
    T extends {
      customerDisplayName?: string;
      vehicleLabel?: string;
    },
  >(inquiry: T, actor: InsuranceActor) {
    if (actor.role !== 'customer') {
      return inquiry;
    }

    const { customerDisplayName: _customerDisplayName, vehicleLabel: _vehicleLabel, ...customerInquiry } =
      inquiry;

    return customerInquiry;
  }

  private buildWorkflowActivities(
    inquiry: {
      paymentStatus?: string | null;
      paymentDueAt?: Date | string | null;
      renewalStatus?: string | null;
    },
    payload: UpdateInsuranceInquiryWorkflowDto,
    actorUserId: string,
  ) {
    const activities: Array<{
      action: PaymentActivityAction | RenewalActivityAction;
      actorUserId: string;
      notes: string | null;
    }> = [];
    const paymentStatusActionByStatus: Partial<Record<NonNullable<typeof payload.paymentStatus>, PaymentActivityAction>> = {
      paid: 'payment_marked_paid',
      overdue: 'payment_marked_overdue',
      verifying: 'payment_verification_started',
    };
    const renewalStatusActionByStatus: Partial<Record<NonNullable<typeof payload.renewalStatus>, RenewalActivityAction>> = {
      quote_preparing: 'renewal_quote_preparing',
      quoted: 'renewal_quoted',
      awaiting_customer: 'renewal_awaiting_customer',
      renewed: 'renewal_renewed',
      expired: 'renewal_expired',
      cancelled: 'renewal_cancelled',
    };

    if (payload.paymentStatus && payload.paymentStatus !== inquiry.paymentStatus) {
      const paymentActivityAction = paymentStatusActionByStatus[payload.paymentStatus];
      if (paymentActivityAction) {
        activities.push({
          action: paymentActivityAction,
          actorUserId,
          notes: payload.reviewNotes ?? null,
        });
      }
    }

    if (payload.renewalStatus && payload.renewalStatus !== inquiry.renewalStatus) {
      const renewalActivityAction = renewalStatusActionByStatus[payload.renewalStatus];
      if (renewalActivityAction) {
        activities.push({
          action: renewalActivityAction,
          actorUserId,
          notes: payload.reviewNotes ?? null,
        });
      }
    }

    if (payload.paymentDueAt !== undefined && this.hasPaymentDueDateChanged(inquiry.paymentDueAt, payload.paymentDueAt)) {
      activities.push({
        action: 'payment_due_date_updated',
        actorUserId,
        notes: payload.reviewNotes ?? null,
      });
    }

    return activities;
  }

  private hasPaymentDueDateChanged(
    currentPaymentDueAt: Date | string | null | undefined,
    nextPaymentDueAt: string,
  ) {
    if (!currentPaymentDueAt) {
      return true;
    }

    return new Date(currentPaymentDueAt).getTime() !== new Date(nextPaymentDueAt).getTime();
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

  private buildCloseRecordUpsert(
    inquiry: {
      id: string;
      userId: string;
      vehicleId: string;
      inquiryType: Parameters<InsuranceRepository['upsertRecordFromInquiry']>[0]['inquiryType'];
      providerName?: string | null;
      policyNumber?: string | null;
    },
    requestedStatus: InsuranceInquiryStatus,
  ): Parameters<InsuranceRepository['upsertRecordFromInquiry']>[0] | undefined {
    if (requestedStatus !== 'closed') {
      return undefined;
    }

    return {
      inquiryId: inquiry.id,
      userId: inquiry.userId,
      vehicleId: inquiry.vehicleId,
      inquiryType: inquiry.inquiryType,
      providerName: inquiry.providerName,
      policyNumber: inquiry.policyNumber,
      status: requestedStatus,
    };
  }

  private asReminderSourceState(
    inquiry: {
      id: string;
      userId: string;
      status: string;
      paymentStatus?: string | null;
      renewalStatus?: string | null;
      subject: string;
      updatedAt?: Date | string | null;
      reviewedAt?: Date | string | null;
    },
  ): InsuranceReminderSourceState {
    return {
      id: inquiry.id,
      userId: inquiry.userId,
      status: inquiry.status as InsuranceInquiryStatus,
      paymentStatus: (inquiry.paymentStatus ?? 'not_required') as InsurancePaymentStatus,
      renewalStatus: (inquiry.renewalStatus ?? 'not_applicable') as InsuranceRenewalStatus,
      subject: inquiry.subject,
      updatedAt: inquiry.updatedAt,
      reviewedAt: inquiry.reviewedAt,
    };
  }

  private buildCustomerReminderState(
    previousInquiry: InsuranceReminderSourceState,
    updatedInquiry: InsuranceReminderSourceState,
  ): InsuranceCustomerReminderState | null {
    if (previousInquiry.status !== 'needs_documents' && updatedInquiry.status === 'needs_documents') {
      return 'needs_documents';
    }

    if (
      updatedInquiry.status === 'payment_pending' &&
      previousInquiry.paymentStatus !== 'overdue' &&
      updatedInquiry.paymentStatus === 'overdue'
    ) {
      return 'payment_overdue';
    }

    if (previousInquiry.status !== 'payment_pending' && updatedInquiry.status === 'payment_pending') {
      return 'payment_pending';
    }

    if (
      updatedInquiry.status === 'for_renewal' &&
      previousInquiry.renewalStatus !== 'awaiting_customer' &&
      updatedInquiry.renewalStatus === 'awaiting_customer'
    ) {
      return 'renewal_awaiting_customer';
    }

    if (previousInquiry.status !== 'for_renewal' && updatedInquiry.status === 'for_renewal') {
      return 'for_renewal';
    }

    return null;
  }

  private buildTransitionedAt(
    inquiry: Pick<InsuranceReminderSourceState, 'updatedAt' | 'reviewedAt'>,
  ) {
    const transitionDate = inquiry.updatedAt ?? inquiry.reviewedAt;

    if (!transitionDate) {
      return null;
    }

    return new Date(transitionDate).toISOString();
  }

  private async emitCustomerReminderTrigger(
    previousInquiry: InsuranceReminderSourceState,
    updatedInquiry: InsuranceReminderSourceState,
  ) {
    const reminderState = this.buildCustomerReminderState(previousInquiry, updatedInquiry);
    if (!reminderState || !this.notificationsService) {
      return;
    }

    const transitionedAt = this.buildTransitionedAt(updatedInquiry);
    if (!transitionedAt) {
      return;
    }

    try {
      await this.notificationsService.applyTrigger(
        createNotificationTrigger('insurance.inquiry_status_changed', 'main-service.insurance', {
          inquiryId: updatedInquiry.id,
          userId: updatedInquiry.userId,
          status: updatedInquiry.status,
          paymentStatus: updatedInquiry.paymentStatus,
          renewalStatus: updatedInquiry.renewalStatus,
          customerReminderState: reminderState,
          transitionedAt,
          subject: updatedInquiry.subject,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to emit insurance status notification for inquiry ${updatedInquiry.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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
