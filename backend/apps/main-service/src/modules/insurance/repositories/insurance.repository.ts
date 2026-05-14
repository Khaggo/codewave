import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { ListInsuranceInquiriesQueryDto } from '../dto/list-insurance-inquiries-query.dto';
import { UpdateInsuranceInquiryWorkflowDto } from '../dto/update-insurance-inquiry-workflow.dto';
import { UpdateInsuranceInquiryStatusDto } from '../dto/update-insurance-inquiry-status.dto';
import { insuranceActivities } from '../schemas/insurance-activity.schema';
import {
  insuranceDocuments,
  insuranceInquiries,
  insuranceDocumentTypeEnum,
  insuranceInquiryStatusEnum,
  insuranceInquiryTypeEnum,
  insuranceRecords,
} from '../schemas/insurance.schema';

type CreateInsuranceInquiryPersistenceInput = CreateInsuranceInquiryDto & {
  createdByUserId: string;
};

type UpdateInsuranceInquiryStatusPersistenceInput = UpdateInsuranceInquiryStatusDto & {
  reviewedByUserId: string;
  reviewedAt: Date;
};

export type UpdateInsuranceInquiryWorkflowPersistenceInput = Omit<
  UpdateInsuranceInquiryWorkflowDto,
  'paymentDueAt' | 'policyExpiryAt' | 'renewalDueAt'
> & {
  paymentDueAt?: Date;
  policyExpiryAt?: Date;
  renewalDueAt?: Date;
  reviewedByUserId: string;
  reviewedAt: Date;
};

export type InsuranceActivityPersistenceInput = {
  action: string;
  actorUserId?: string | null;
  documentType?: (typeof insuranceDocumentTypeEnum.enumValues)[number] | null;
  notes?: string | null;
};

type UploadInsuranceDocumentPersistenceInput = {
  document: AddInsuranceDocumentDto;
  activity: InsuranceActivityPersistenceInput;
  uploadedByUserId: string;
};

export type UpsertInsuranceRecordInput = {
  inquiryId: string;
  userId: string;
  vehicleId: string;
  inquiryType: (typeof insuranceInquiryTypeEnum.enumValues)[number];
  providerName?: string | null;
  policyNumber?: string | null;
  status: (typeof insuranceInquiryStatusEnum.enumValues)[number];
};

@Injectable()
export class InsuranceRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(payload: CreateInsuranceInquiryPersistenceInput) {
    const values = {
      userId: payload.userId,
      vehicleId: payload.vehicleId,
      inquiryType: payload.inquiryType,
      ...(payload.purpose ? { purpose: payload.purpose } : {}),
      subject: payload.subject,
      description: payload.description,
      providerName: payload.providerName ?? null,
      policyNumber: payload.policyNumber ?? null,
      notes: payload.notes ?? null,
      status: 'submitted' as const,
      createdByUserId: payload.createdByUserId,
    };

    const [createdInquiry] = await this.db
      .insert(insuranceInquiries)
      .values(values)
      .returning();

    return this.findById(createdInquiry.id);
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const inquiry = await db.query.insuranceInquiries.findFirst({
      where: eq(insuranceInquiries.id, id),
      with: {
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
    });

    const resolvedInquiry = this.assertFound(inquiry, 'Insurance inquiry not found');
    const activities = await this.listActivitiesByInquiryId(id, db);

    return {
      ...resolvedInquiry,
      activities,
    };
  }

  async findByUserId(userId: string) {
    const inquiries = await this.db.query.insuranceInquiries.findMany({
      where: eq(insuranceInquiries.userId, userId),
      with: {
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
      orderBy: desc(insuranceInquiries.createdAt),
    });

    return this.attachActivitiesToInquiries(inquiries);
  }

  async listForStaff(query: ListInsuranceInquiriesQueryDto) {
    const inquiries = await this.db.query.insuranceInquiries.findMany({
      where: and(
        query.status ? eq(insuranceInquiries.status, query.status) : undefined,
        query.paymentStatus ? eq(insuranceInquiries.paymentStatus, query.paymentStatus) : undefined,
        query.renewalStatus ? eq(insuranceInquiries.renewalStatus, query.renewalStatus) : undefined,
      ),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
      orderBy: desc(insuranceInquiries.updatedAt),
    });

    const activitiesByInquiryId = await this.listActivitiesByInquiryIds(inquiries.map((inquiry) => inquiry.id));

    return inquiries.map((inquiry) => ({
      ...inquiry,
      customerDisplayName: this.buildCustomerDisplayName(inquiry.user?.profile),
      vehicleLabel: this.buildVehicleLabel(inquiry.vehicle),
      activities: activitiesByInquiryId.get(inquiry.id) ?? [],
    }));
  }

  async updateStatus(
    id: string,
    payload: UpdateInsuranceInquiryStatusPersistenceInput,
    recordUpsert?: UpsertInsuranceRecordInput,
  ) {
    return this.db.transaction(async (tx) => {
      const [updatedInquiry] = await tx
        .update(insuranceInquiries)
        .set({
          status: payload.status,
          reviewNotes: payload.reviewNotes ?? null,
          reviewedByUserId: payload.reviewedByUserId,
          reviewedAt: payload.reviewedAt,
          updatedAt: new Date(),
        })
        .where(eq(insuranceInquiries.id, id))
        .returning();

      this.assertFound(updatedInquiry, 'Insurance inquiry not found');

      if (recordUpsert) {
        await this.upsertRecordFromInquiry(recordUpsert, tx);
      }

      return this.findById(id, tx);
    });
  }

  async updateWorkflow(
    id: string,
    payload: UpdateInsuranceInquiryWorkflowPersistenceInput,
    activities: InsuranceActivityPersistenceInput[] = [],
    recordUpsert?: UpsertInsuranceRecordInput,
  ) {
    const workflowPatch = {
      status: payload.status,
      ...(payload.documentStatus !== undefined ? { documentStatus: payload.documentStatus } : {}),
      ...(payload.paymentStatus !== undefined ? { paymentStatus: payload.paymentStatus } : {}),
      ...(payload.renewalStatus !== undefined ? { renewalStatus: payload.renewalStatus } : {}),
      ...(payload.paymentDueAt !== undefined ? { paymentDueAt: payload.paymentDueAt } : {}),
      ...(payload.policyExpiryAt !== undefined ? { policyExpiryAt: payload.policyExpiryAt } : {}),
      ...(payload.renewalDueAt !== undefined ? { renewalDueAt: payload.renewalDueAt } : {}),
      ...(payload.assignedStaffId !== undefined ? { assignedStaffId: payload.assignedStaffId } : {}),
      ...(payload.reviewNotes !== undefined ? { reviewNotes: payload.reviewNotes } : {}),
      reviewedByUserId: payload.reviewedByUserId,
      reviewedAt: payload.reviewedAt,
      updatedAt: new Date(),
    };

    return this.db.transaction(async (tx) => {
      const [updatedInquiry] = await tx
        .update(insuranceInquiries)
        .set(workflowPatch)
        .where(eq(insuranceInquiries.id, id))
        .returning();

      this.assertFound(updatedInquiry, 'Insurance inquiry not found');

      if (activities.length) {
        await tx.insert(insuranceActivities).values(
          activities.map((activity) => ({
            inquiryId: id,
            action: activity.action,
            actorUserId: activity.actorUserId ?? null,
            documentType: activity.documentType ?? null,
            notes: activity.notes ?? null,
          })),
        );
      }

      if (recordUpsert) {
        await this.upsertRecordFromInquiry(recordUpsert, tx);
      }

      return this.findById(id, tx);
    });
  }

  async addDocument(id: string, payload: AddInsuranceDocumentDto, uploadedByUserId: string) {
    const inquiry = await this.findById(id);

    await this.db.insert(insuranceDocuments).values({
      inquiryId: inquiry.id,
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      documentType: payload.documentType,
      notes: payload.notes ?? null,
      uploadedByUserId,
    });

    return this.findById(id);
  }

  async addUploadedDocument(id: string, payload: UploadInsuranceDocumentPersistenceInput) {
    return this.db.transaction(async (tx) => {
      const inquiry = await this.findById(id, tx);

      await tx.insert(insuranceDocuments).values({
        inquiryId: inquiry.id,
        fileName: payload.document.fileName,
        fileUrl: payload.document.fileUrl,
        documentType: payload.document.documentType,
        notes: payload.document.notes ?? null,
        uploadedByUserId: payload.uploadedByUserId,
      });

      await tx.insert(insuranceActivities).values({
        inquiryId: inquiry.id,
        action: payload.activity.action,
        actorUserId: payload.activity.actorUserId ?? null,
        documentType: payload.activity.documentType ?? null,
        notes: payload.activity.notes ?? null,
      });

      return this.findById(id, tx);
    });
  }

  async appendActivity(inquiryId: string, payload: InsuranceActivityPersistenceInput) {
    const [activity] = await this.db
      .insert(insuranceActivities)
      .values({
        inquiryId,
        action: payload.action,
        actorUserId: payload.actorUserId ?? null,
        documentType: payload.documentType ?? null,
        notes: payload.notes ?? null,
      })
      .returning();

    return this.assertFound(activity, 'Insurance activity not found');
  }

  async listActivitiesByInquiryId(inquiryId: string, db: AppDatabase = this.db) {
    const activities = await db
      .select()
      .from(insuranceActivities)
      .where(eq(insuranceActivities.inquiryId, inquiryId))
      .orderBy(insuranceActivities.createdAt);

    return activities;
  }

  async upsertRecordFromInquiry(payload: UpsertInsuranceRecordInput, db: AppDatabase = this.db) {
    const existingRecord = await db.query.insuranceRecords.findFirst({
      where: eq(insuranceRecords.inquiryId, payload.inquiryId),
    });

    if (existingRecord) {
      const [updatedRecord] = await db
        .update(insuranceRecords)
        .set({
          providerName: payload.providerName ?? null,
          policyNumber: payload.policyNumber ?? null,
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(eq(insuranceRecords.id, existingRecord.id))
        .returning();

      return this.assertFound(updatedRecord, 'Insurance record not found');
    }

    const [createdRecord] = await db
      .insert(insuranceRecords)
      .values({
        inquiryId: payload.inquiryId,
        userId: payload.userId,
        vehicleId: payload.vehicleId,
        inquiryType: payload.inquiryType,
        providerName: payload.providerName ?? null,
        policyNumber: payload.policyNumber ?? null,
        status: payload.status,
      })
      .returning();

    return createdRecord;
  }

  async findRecordsByVehicleId(vehicleId: string) {
    return this.db.query.insuranceRecords.findMany({
      where: eq(insuranceRecords.vehicleId, vehicleId),
      orderBy: desc(insuranceRecords.updatedAt),
    });
  }

  async listForAnalytics() {
    return this.db.query.insuranceInquiries.findMany({
      with: {
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
      orderBy: [desc(insuranceInquiries.createdAt), desc(insuranceInquiries.id)],
    });
  }

  private async listActivitiesByInquiryIds(inquiryIds: string[], db: AppDatabase = this.db) {
    if (!inquiryIds.length) {
      return new Map<string, Awaited<ReturnType<typeof this.listActivitiesByInquiryId>>>();
    }

    const activities = await db
      .select()
      .from(insuranceActivities)
      .where(inArray(insuranceActivities.inquiryId, inquiryIds))
      .orderBy(insuranceActivities.createdAt);

    const activitiesByInquiryId = new Map<string, typeof activities>();

    activities.forEach((activity) => {
      const currentActivities = activitiesByInquiryId.get(activity.inquiryId) ?? [];
      currentActivities.push(activity);
      activitiesByInquiryId.set(activity.inquiryId, currentActivities);
    });

    return activitiesByInquiryId;
  }

  private async attachActivitiesToInquiries<T extends { id: string }>(inquiries: T[]) {
    const activitiesByInquiryId = await this.listActivitiesByInquiryIds(
      inquiries.map((inquiry) => inquiry.id),
    );

    return inquiries.map((inquiry) => ({
      ...inquiry,
      activities: activitiesByInquiryId.get(inquiry.id) ?? [],
    }));
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
}
