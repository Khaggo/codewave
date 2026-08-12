import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { CreateRenewalFollowUpDto } from '../dto/create-renewal-follow-up.dto';
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
import {
  canonicalizeInsuranceDateTime,
  resolveInsuranceRequirements,
} from '../services/insurance-workflow-policy';

type CreateInsuranceInquiryPersistenceInput = CreateInsuranceInquiryDto & {
  createdByUserId: string;
};

type CreateRenewalFollowUpPersistenceInput = CreateRenewalFollowUpDto & {
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
  customerMessage?: string | null;
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
    try {
      return await this.db.transaction(async (tx) => {
        const [createdInquiry] = await tx
          .insert(insuranceInquiries)
          .values({
            userId: payload.userId,
            vehicleId: payload.vehicleId,
            clientRequestId: payload.clientRequestId ?? null,
            inquiryType: payload.inquiryType,
            ...(payload.purpose ? { purpose: payload.purpose } : {}),
            subject: payload.subject,
            description: payload.description,
            providerName: payload.providerName ?? null,
            policyNumber: payload.policyNumber ?? null,
            incidentOccurredAt: payload.incidentOccurredAt
              ? new Date(canonicalizeInsuranceDateTime(payload.incidentOccurredAt) as string)
              : null,
            incidentLocation: payload.incidentLocation ?? null,
            notes: payload.notes ?? null,
            status: 'submitted' as const,
            createdByUserId: payload.createdByUserId,
          })
          .returning();

        return this.findById(createdInquiry.id, tx);
      });
    } catch (error) {
      if (payload.clientRequestId && this.isUniqueViolation(error)) {
        const existingInquiry = await this.findByClientRequestId(payload.userId, payload.clientRequestId);
        if (existingInquiry) {
          return existingInquiry;
        }
      }

      throw error;
    }
  }

  async createRenewalFollowUp(
    payload: CreateRenewalFollowUpPersistenceInput,
    activity: InsuranceActivityPersistenceInput,
  ) {
    return this.db.transaction(async (tx) => {
      const [createdInquiry] = await tx
        .insert(insuranceInquiries)
        .values({
          userId: payload.userId,
          vehicleId: payload.vehicleId,
          inquiryType: payload.inquiryType,
          purpose: 'renewal',
          subject: payload.subject,
          description: payload.description,
          providerName: payload.providerName ?? null,
          policyNumber: payload.policyNumber ?? null,
          notes: payload.notes ?? null,
          status: 'for_renewal',
          documentStatus: 'incomplete',
          paymentStatus: 'not_required',
          renewalStatus: 'upcoming',
          assignedStaffId: payload.assignedStaffId ?? null,
          policyExpiryAt: payload.policyExpiryAt ? new Date(payload.policyExpiryAt) : null,
          renewalDueAt: new Date(payload.renewalDueAt),
          createdByUserId: payload.createdByUserId,
        })
        .returning();

      await tx.insert(insuranceActivities).values({
        inquiryId: createdInquiry.id,
        action: activity.action,
        actorUserId: activity.actorUserId ?? null,
        documentType: activity.documentType ?? null,
        notes: activity.notes ?? null,
      });

      return this.findById(createdInquiry.id, tx);
    });
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const inquiry = await db.query.insuranceInquiries.findFirst({
      where: eq(insuranceInquiries.id, id),
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
    });

    const resolvedInquiry = this.assertFound(inquiry, 'Insurance inquiry not found');
    const { user, vehicle, ...inquiryWithoutRelations } = resolvedInquiry;
    const activities = await this.listActivitiesByInquiryId(id, db);

    return {
      ...inquiryWithoutRelations,
      customerDisplayName: this.buildCustomerDisplayName(user?.profile),
      vehicleLabel: this.buildVehicleLabel(vehicle),
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

  async findByClientRequestId(userId: string, clientRequestId: string) {
    const inquiry = await this.db.query.insuranceInquiries.findFirst({
      where: and(
        eq(insuranceInquiries.userId, userId),
        eq(insuranceInquiries.clientRequestId, clientRequestId),
      ),
      with: {
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
    });

    if (!inquiry) {
      return null;
    }

    const [withActivities] = await this.attachActivitiesToInquiries([inquiry]);
    return withActivities;
  }

  async listForCustomer({
    userId,
    vehicleId,
    status,
    cursor,
    limit,
  }: {
    userId: string;
    vehicleId?: string;
    status?: (typeof insuranceInquiryStatusEnum.enumValues)[number];
    cursor?: { createdAt: Date; id: string };
    limit: number;
  }) {
    const inquiries = await this.db.query.insuranceInquiries.findMany({
      where: and(
        eq(insuranceInquiries.userId, userId),
        vehicleId ? eq(insuranceInquiries.vehicleId, vehicleId) : undefined,
        status ? eq(insuranceInquiries.status, status) : undefined,
        cursor
          ? or(
              lt(insuranceInquiries.createdAt, cursor.createdAt),
              and(
                eq(insuranceInquiries.createdAt, cursor.createdAt),
                lt(insuranceInquiries.id, cursor.id),
              ),
            )
          : undefined,
      ),
      with: {
        documents: {
          orderBy: desc(insuranceDocuments.createdAt),
        },
      },
      orderBy: [desc(insuranceInquiries.createdAt), desc(insuranceInquiries.id)],
      limit: limit + 1,
    });

    const hasNext = inquiries.length > limit;
    const pageItems = hasNext ? inquiries.slice(0, limit) : inquiries;

    return {
      items: await this.attachActivitiesToInquiries(pageItems),
      hasNext,
    };
  }

  async findInquiriesByVehicleId(vehicleId: string) {
    const inquiries = await this.db.query.insuranceInquiries.findMany({
      where: eq(insuranceInquiries.vehicleId, vehicleId),
      orderBy: desc(insuranceInquiries.updatedAt),
    });

    return inquiries;
  }

  async findDocumentById(documentId: string) {
    const document = await this.db.query.insuranceDocuments.findFirst({
      where: eq(insuranceDocuments.id, documentId),
      with: {
        inquiry: true,
      },
    });

    return this.assertFound(document, 'Insurance document not found');
  }

  async listForStaff(query: ListInsuranceInquiriesQueryDto) {
    const inquiries = await this.db.query.insuranceInquiries.findMany({
      where: and(
        query.purpose ? eq(insuranceInquiries.purpose, query.purpose) : undefined,
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
    activity?: InsuranceActivityPersistenceInput,
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
        .where(
          and(
            eq(insuranceInquiries.id, id),
            ...(payload.expectedUpdatedAt
              ? [eq(insuranceInquiries.updatedAt, new Date(payload.expectedUpdatedAt))]
              : []),
          ),
        )
        .returning();

      if (!updatedInquiry && payload.expectedUpdatedAt) {
        throw new ConflictException('Another staff member already updated this insurance case. Reload and try again.');
      }

      this.assertFound(updatedInquiry, 'Insurance inquiry not found');

      if (recordUpsert) {
        await this.upsertRecordFromInquiry(recordUpsert, tx);
      }

      if (activity) {
        await tx.insert(insuranceActivities).values({
          inquiryId: id,
          action: activity.action,
          actorUserId: activity.actorUserId ?? null,
          documentType: activity.documentType ?? null,
          notes: activity.notes ?? null,
          customerMessage: activity.customerMessage ?? null,
        });
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
        .where(
          and(
            eq(insuranceInquiries.id, id),
            ...(payload.expectedUpdatedAt
              ? [eq(insuranceInquiries.updatedAt, new Date(payload.expectedUpdatedAt))]
              : []),
          ),
        )
        .returning();

      if (!updatedInquiry && payload.expectedUpdatedAt) {
        throw new ConflictException('Another staff member already updated this insurance case. Reload and try again.');
      }

      this.assertFound(updatedInquiry, 'Insurance inquiry not found');

      if (activities.length) {
        await tx.insert(insuranceActivities).values(
          activities.map((activity) => ({
            inquiryId: id,
            action: activity.action,
            actorUserId: activity.actorUserId ?? null,
            documentType: activity.documentType ?? null,
            notes: activity.notes ?? null,
            customerMessage: activity.customerMessage ?? null,
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
    return this.db.transaction(async (tx) => {
      const inquiry = await this.findById(id, tx);

      await tx.insert(insuranceDocuments).values({
        inquiryId: inquiry.id,
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        documentType: payload.documentType,
        notes: payload.notes ?? null,
        uploadedByUserId,
      });

      await this.syncDocumentReviewStatus(id, inquiry, tx, payload.documentType);

      return this.findById(id, tx);
    });
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

      await this.syncDocumentReviewStatus(id, inquiry, tx, payload.document.documentType);

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
        customerMessage: payload.customerMessage ?? null,
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

  private async syncDocumentReviewStatus(
    inquiryId: string,
    inquiry: Awaited<ReturnType<InsuranceRepository['findById']>>,
    tx: AppDatabase,
    nextDocumentType?: (typeof insuranceDocumentTypeEnum.enumValues)[number],
  ) {
    const nextDocumentStatus = resolveInsuranceRequirements({
      purpose: inquiry.purpose,
      documents: [
        ...(Array.isArray(inquiry.documents) ? inquiry.documents : []),
        ...(nextDocumentType ? [{ documentType: nextDocumentType }] : []),
      ],
      activities: inquiry.activities,
    }).documentStatus;

    if (nextDocumentStatus === inquiry.documentStatus) {
      return;
    }

    await tx
      .update(insuranceInquiries)
      .set({
        documentStatus: nextDocumentStatus,
        updatedAt: new Date(),
      })
      .where(eq(insuranceInquiries.id, inquiryId));
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

  private isUniqueViolation(error: unknown) {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505',
    );
  }

}
