import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateJobOrderDto } from '../dto/create-job-order.dto';
import { AddJobOrderPhotoDto } from '../dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../dto/add-job-order-progress.dto';
import { FinalizeJobOrderDto } from '../dto/finalize-job-order.dto';
import { RecordJobOrderInvoicePaymentDto } from '../dto/record-job-order-invoice-payment.dto';
import { ReplaceJobOrderAssignmentsDto } from '../dto/replace-job-order-assignments.dto';
import { UpdateJobOrderStatusDto } from '../dto/update-job-order-status.dto';
import {
  jobOrders,
  jobOrderAssignments,
  jobOrderInvoiceRecords,
  jobOrderItems,
  jobOrderPhotos,
  jobOrderProgressLogs,
} from '../schemas/job-orders.schema';

type CreateJobOrderPersistenceInput = Pick<
  CreateJobOrderDto,
  | 'sourceType'
  | 'sourceId'
  | 'customerUserId'
  | 'vehicleId'
  | 'serviceAdviserUserId'
  | 'serviceAdviserCode'
  | 'notes'
> & {
  status: 'draft' | 'assigned';
  jobType: 'normal' | 'back_job';
  parentJobOrderId?: string | null;
  items: CreateJobOrderDto['items'];
  assignedTechnicianIds?: string[];
};

type UpdateJobOrderStatusPersistenceInput = UpdateJobOrderStatusDto;
type ReplaceJobOrderAssignmentsPersistenceInput = {
  assignedTechnicianIds: ReplaceJobOrderAssignmentsDto['assignedTechnicianIds'];
  status?: UpdateJobOrderStatusDto['status'];
  notes?: string | null;
};
type FinalizeJobOrderPersistenceInput = FinalizeJobOrderDto & {
  finalizedByUserId: string;
  invoiceReference: string;
  officialReceiptReference: string;
  subtotalAmountCents: number;
  laborAmountCents: number;
  partsAmountCents: number;
  reservationFeeDeductionCents: number;
  totalAmountCents: number;
};

type RecordJobOrderInvoicePaymentPersistenceInput = Omit<
  RecordJobOrderInvoicePaymentDto,
  'receivedAt'
> & {
  recordedByUserId: string;
  receivedAt: Date;
};

@Injectable()
export class JobOrdersRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(payload: CreateJobOrderPersistenceInput) {
    const createdRows = await this.db
      .insert(jobOrders)
      .values({
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        jobType: payload.jobType,
        parentJobOrderId: payload.parentJobOrderId ?? null,
        customerUserId: payload.customerUserId,
        vehicleId: payload.vehicleId,
        serviceAdviserUserId: payload.serviceAdviserUserId,
        serviceAdviserCode: payload.serviceAdviserCode,
        status: payload.status,
        notes: payload.notes ?? null,
      })
      .returning();
    const createdJobOrder = this.assertFound(createdRows[0], 'Job order not found');

    await this.db.insert(jobOrderItems).values(
      payload.items.map((item, index) => ({
        jobOrderId: createdJobOrder.id,
        name: item.name,
        description: item.description ?? null,
        estimatedHours: item.estimatedHours ?? null,
        sortOrder: index,
      })),
    );

    if (payload.assignedTechnicianIds?.length) {
      await this.db.insert(jobOrderAssignments).values(
        payload.assignedTechnicianIds.map((technicianUserId) => ({
          jobOrderId: createdJobOrder.id,
          technicianUserId,
        })),
      );
    }

    return this.findById(createdJobOrder.id);
  }

  async findById(id: string, db: AppDatabase = this.db) {
    const jobOrder = await db.query.jobOrders.findFirst({
      where: eq(jobOrders.id, id),
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: true,
      },
    });

    return this.assertFound(jobOrder, 'Job order not found');
  }

  async findOptionalById(id: string) {
    return this.db.query.jobOrders.findFirst({
      where: eq(jobOrders.id, id),
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: true,
      },
    });
  }

  async findAssignedToTechnician(technicianUserId: string) {
    const assignmentRows = await this.db
      .select({ jobOrderId: jobOrderAssignments.jobOrderId })
      .from(jobOrderAssignments)
      .where(eq(jobOrderAssignments.technicianUserId, technicianUserId));

    const jobOrderIds = assignmentRows.map((row) => row.jobOrderId);
    if (jobOrderIds.length === 0) {
      return [];
    }

    return this.db.query.jobOrders.findMany({
      where: inArray(jobOrders.id, jobOrderIds),
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: true,
      },
    });
  }

  async findAssignedSummaries(technicianUserId: string) {
    const assignmentRows = await this.db
      .select({ jobOrderId: jobOrderAssignments.jobOrderId })
      .from(jobOrderAssignments)
      .where(eq(jobOrderAssignments.technicianUserId, technicianUserId));

    const jobOrderIds = assignmentRows.map((row) => row.jobOrderId);
    if (jobOrderIds.length === 0) {
      return [];
    }

    return this.db.query.jobOrders.findMany({
      where: inArray(jobOrders.id, jobOrderIds),
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
      },
    });
  }

  async findAllSummaries() {
    return this.db.query.jobOrders.findMany({
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
      },
    });
  }

  async findByVehicleId(vehicleId: string) {
    return this.db.query.jobOrders.findMany({
      where: eq(jobOrders.vehicleId, vehicleId),
      orderBy: asc(jobOrders.createdAt),
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: true,
      },
    });
  }

  async listForAnalytics() {
    return this.db.query.jobOrders.findMany({
      orderBy: [desc(jobOrders.createdAt), desc(jobOrders.id)],
      with: {
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        invoiceRecord: true,
      },
    });
  }

  async hasBookingSource(sourceId: string) {
    const existingJobOrder = await this.db.query.jobOrders.findFirst({
      where: and(eq(jobOrders.sourceType, 'booking'), eq(jobOrders.sourceId, sourceId)),
    });

    return Boolean(existingJobOrder);
  }

  async hasBackJobSource(sourceId: string) {
    const existingJobOrder = await this.db.query.jobOrders.findFirst({
      where: and(eq(jobOrders.sourceType, 'back_job'), eq(jobOrders.sourceId, sourceId)),
    });

    return Boolean(existingJobOrder);
  }

  async updateStatus(id: string, payload: UpdateJobOrderStatusPersistenceInput) {
    const [updatedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(eq(jobOrders.id, id))
      .returning();

    this.assertFound(updatedJobOrder, 'Job order not found');
    return this.findById(id);
  }

  async replaceAssignments(id: string, payload: ReplaceJobOrderAssignmentsPersistenceInput) {
    return this.db.transaction(async (tx) => {
      const existingJobOrder = await tx.query.jobOrders.findFirst({
        where: eq(jobOrders.id, id),
      });
      this.assertFound(existingJobOrder, 'Job order not found');

      await tx.delete(jobOrderAssignments).where(eq(jobOrderAssignments.jobOrderId, id));

      if (payload.assignedTechnicianIds.length > 0) {
        await tx.insert(jobOrderAssignments).values(
          payload.assignedTechnicianIds.map((technicianUserId) => ({
            jobOrderId: id,
            technicianUserId,
          })),
        );
      }

      const updatePayload: {
        updatedAt: Date;
        status?: UpdateJobOrderStatusDto['status'];
        notes?: string | null;
      } = {
        updatedAt: new Date(),
      };

      if (payload.status) {
        updatePayload.status = payload.status;
      }

      if (payload.notes !== undefined) {
        updatePayload.notes = payload.notes;
      }

      const [updatedJobOrder] = await tx
        .update(jobOrders)
        .set(updatePayload)
        .where(eq(jobOrders.id, id))
        .returning();

      this.assertFound(updatedJobOrder, 'Job order not found');
      return this.findById(id, tx);
    });
  }

  async findByStatuses(statuses: UpdateJobOrderStatusDto['status'][]) {
    if (statuses.length === 0) {
      return [];
    }

    return this.db.query.jobOrders.findMany({
      where: inArray(jobOrders.status, statuses),
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        assignments: {
          orderBy: asc(jobOrderAssignments.assignedAt),
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: true,
      },
    });
  }

  async findFinalizedByCustomerUserId(customerUserId: string) {
    return this.db.query.jobOrders.findMany({
      where: and(eq(jobOrders.customerUserId, customerUserId), eq(jobOrders.status, 'finalized')),
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        items: {
          orderBy: asc(jobOrderItems.sortOrder),
        },
        invoiceRecord: true,
      },
    });
  }

  async addProgressEntry(
    id: string,
    payload: AddJobOrderProgressDto & { attachedPhotoIds?: string[] },
    technicianUserId: string,
  ) {
    if (payload.completedItemIds?.length) {
      await this.db
        .update(jobOrderItems)
        .set({
          isCompleted: true,
          updatedAt: new Date(),
        })
        .where(and(eq(jobOrderItems.jobOrderId, id), inArray(jobOrderItems.id, payload.completedItemIds)));
    }

    await this.db.insert(jobOrderProgressLogs).values({
      jobOrderId: id,
      technicianUserId,
      entryType: payload.entryType,
      message: payload.message,
      completedItemIds: payload.completedItemIds ?? [],
      attachedPhotoIds: payload.attachedPhotoIds ?? [],
    });

    return this.findById(id);
  }

  async addPhoto(
    id: string,
    payload: AddJobOrderPhotoDto & {
      id?: string;
      linkedEntityType?: 'job_order' | 'progress_entry' | 'work_item' | 'qa_review';
      linkedEntityId?: string | null;
      storageKey?: string;
      mimeType?: string;
      fileSizeBytes?: number;
    },
    takenByUserId: string,
  ) {
    const photoId = payload.id ?? randomUUID();
    await this.db.insert(jobOrderPhotos).values({
      id: photoId,
      jobOrderId: id,
      takenByUserId,
      linkedEntityType: payload.linkedEntityType ?? 'job_order',
      linkedEntityId: payload.linkedEntityId ?? null,
      storageKey: payload.storageKey ?? payload.fileName,
      mimeType: payload.mimeType ?? 'image/jpeg',
      fileSizeBytes: payload.fileSizeBytes ?? 0,
      fileName: payload.fileName,
      fileUrl: payload.fileUrl,
      caption: payload.caption ?? null,
    });

    return this.findById(id);
  }

  async finalize(id: string, payload: FinalizeJobOrderPersistenceInput) {
    const jobOrder = await this.findById(id);

    await this.db.insert(jobOrderInvoiceRecords).values({
      jobOrderId: id,
      invoiceReference: payload.invoiceReference,
      officialReceiptReference: payload.officialReceiptReference,
      sourceType: jobOrder.sourceType,
      sourceId: jobOrder.sourceId,
      customerUserId: jobOrder.customerUserId,
      vehicleId: jobOrder.vehicleId,
      serviceAdviserUserId: jobOrder.serviceAdviserUserId,
      serviceAdviserCode: jobOrder.serviceAdviserCode,
      finalizedByUserId: payload.finalizedByUserId,
      paymentStatus: 'pending_payment',
      currencyCode: 'PHP',
      subtotalAmountCents: payload.subtotalAmountCents,
      laborAmountCents: payload.laborAmountCents,
      partsAmountCents: payload.partsAmountCents,
      reservationFeeDeductionCents: payload.reservationFeeDeductionCents,
      totalAmountCents: payload.totalAmountCents,
      amountPaidCents: null,
      paymentMethod: null,
      paymentReference: null,
      paidAt: null,
      recordedByUserId: null,
      summary: payload.summary ?? null,
    });

    const [updatedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        status: 'finalized',
        updatedAt: new Date(),
      })
      .where(eq(jobOrders.id, id))
      .returning();

    this.assertFound(updatedJobOrder, 'Job order not found');
    return this.findById(id);
  }

  async updateInvoiceRecord(id: string, payload: Partial<{
    paymentStatus: 'pending_payment' | 'paid';
    amountPaidCents: number | null;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other' | null;
    paymentReference: string | null;
    paidAt: Date | null;
    recordedByUserId: string | null;
    summary: string | null;
    pdfGeneratedAt: Date | null;
    pdfEmailSentAt: Date | null;
    pdfEmailError: string | null;
  }>) {
    const jobOrder = await this.findById(id);
    const invoiceRecord = this.assertFound(jobOrder.invoiceRecord, 'Job order invoice record not found');

    const [updatedInvoiceRecord] = await this.db
      .update(jobOrderInvoiceRecords)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(jobOrderInvoiceRecords.id, invoiceRecord.id))
      .returning();

    this.assertFound(updatedInvoiceRecord, 'Job order invoice record not found');
    return this.findById(id);
  }

  async recordInvoicePayment(id: string, payload: RecordJobOrderInvoicePaymentPersistenceInput) {
    const jobOrder = await this.findById(id);
    const invoiceRecord = this.assertFound(jobOrder.invoiceRecord, 'Job order invoice record not found');

    const [updatedInvoiceRecord] = await this.db
      .update(jobOrderInvoiceRecords)
      .set({
        paymentStatus: 'paid',
        amountPaidCents: payload.amountPaidCents,
        paymentMethod: payload.paymentMethod,
        paymentReference: payload.reference ?? null,
        paidAt: payload.receivedAt,
        recordedByUserId: payload.recordedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(jobOrderInvoiceRecords.id, invoiceRecord.id))
      .returning();

    this.assertFound(updatedInvoiceRecord, 'Job order invoice record not found');
    return this.findById(id);
  }
}
