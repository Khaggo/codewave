import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { AddInsuranceDocumentDto } from '../dto/add-insurance-document.dto';
import { CreateInsuranceInquiryDto } from '../dto/create-insurance-inquiry.dto';
import { UpdateInsuranceInquiryStatusDto } from '../dto/update-insurance-inquiry-status.dto';
import {
  insuranceDocuments,
  insuranceInquiries,
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

type UpsertInsuranceRecordInput = {
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
    const [createdInquiry] = await this.db
      .insert(insuranceInquiries)
      .values({
        userId: payload.userId,
        vehicleId: payload.vehicleId,
        inquiryType: payload.inquiryType,
        subject: payload.subject,
        description: payload.description,
        providerName: payload.providerName ?? null,
        policyNumber: payload.policyNumber ?? null,
        notes: payload.notes ?? null,
        status: 'submitted',
        createdByUserId: payload.createdByUserId,
      })
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

    return this.assertFound(inquiry, 'Insurance inquiry not found');
  }

  async updateStatus(id: string, payload: UpdateInsuranceInquiryStatusPersistenceInput) {
    const [updatedInquiry] = await this.db
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
    return this.findById(id);
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

  async upsertRecordFromInquiry(payload: UpsertInsuranceRecordInput) {
    const existingRecord = await this.db.query.insuranceRecords.findFirst({
      where: eq(insuranceRecords.inquiryId, payload.inquiryId),
    });

    if (existingRecord) {
      const [updatedRecord] = await this.db
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

    const [createdRecord] = await this.db
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
}
