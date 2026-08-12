import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
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
import { UpdateJobOrderWorkshopStageDto } from '../dto/update-job-order-workshop-stage.dto';
import {
  jobOrders,
  jobOrderAssignments,
  jobOrderInvoiceCorrections,
  jobOrderInvoiceLineItemSnapshots,
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
  assignments?: CreateJobOrderDto['assignments'];
};

type UpdateJobOrderStatusPersistenceInput = UpdateJobOrderStatusDto;
type ReplaceJobOrderAssignmentsPersistenceInput = {
  assignments: ReplaceJobOrderAssignmentsDto['assignments'];
  status?: UpdateJobOrderStatusDto['status'];
  notes?: string | null;
  expectedUpdatedAt?: string;
};
type UpdateJobOrderWorkshopStagePersistenceInput = UpdateJobOrderWorkshopStageDto & {
  recordedByUserId: string;
  attachedPhotoIds?: string[];
  nextStatus?: UpdateJobOrderStatusDto['status'];
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
  lineItemSnapshots: InvoiceLineItemSnapshotInput[];
};

type InvoiceLineItemSnapshotInput = {
  sourceJobOrderItemId?: string | null;
  category: 'service' | 'labor' | 'part' | 'other';
  description: string;
  quantity: number;
  unitAmountCents: number;
  lineAmountCents: number;
};

type InvoiceCorrectionPersistenceInput = {
  expectedVersion: number;
  idempotencyKey: string;
  requestFingerprint: string;
  actorUserId: string;
  reason: string;
};

type VoidAndReissueInvoicePersistenceInput = InvoiceCorrectionPersistenceInput & {
  invoiceReference: string;
  officialReceiptReference: string;
  summary?: string;
  reservationFeeDeductionCents?: number;
  lineItemSnapshots?: InvoiceLineItemSnapshotInput[];
};

type CompleteInvoicePaymentReversalPersistenceInput = InvoiceCorrectionPersistenceInput & {
  reversalReference: string;
  completedAt: Date;
};

type RecordJobOrderInvoicePaymentPersistenceInput = Omit<
  RecordJobOrderInvoicePaymentDto,
  'receivedAt'
> & {
  recordedByUserId: string;
  receivedAt: Date;
};

const createUpdatedAtMatchFilters = (expectedUpdatedAt?: string) => {
  if (!expectedUpdatedAt) {
    return [];
  }

  const expectedDate = new Date(expectedUpdatedAt);
  const nextMillisecond = new Date(expectedDate.getTime() + 1);

  return [gte(jobOrders.updatedAt, expectedDate), lt(jobOrders.updatedAt, nextMillisecond)];
};

const matchesUpdatedAtWithinMillisecond = (actualUpdatedAt: Date, expectedUpdatedAt?: string) => {
  if (!expectedUpdatedAt) {
    return true;
  }

  return actualUpdatedAt.getTime() === new Date(expectedUpdatedAt).getTime();
};

@Injectable()
export class JobOrdersRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async create(payload: CreateJobOrderPersistenceInput) {
    return this.db.transaction(async (tx) => {
      const createdRows = await tx
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

      await tx.insert(jobOrderItems).values(
        payload.items.map((item, index) => ({
          jobOrderId: createdJobOrder.id,
          name: item.name,
          description: item.description ?? null,
          estimatedHours: item.estimatedHours ?? null,
          sortOrder: index,
        })),
      );

      if (payload.assignments?.length) {
        await tx.insert(jobOrderAssignments).values(
          payload.assignments.map((assignment) => ({
            jobOrderId: createdJobOrder.id,
            technicianProfileId: assignment.technicianProfileId,
            selectedSpecialty: assignment.selectedSpecialty,
          })),
        );
      }

      return this.findById(createdJobOrder.id, tx);
    });
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
          with: {
            technicianProfile: true,
          },
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

  async findLatestByIntakeSourceId(intakeId: string) {
    return this.db.query.jobOrders.findFirst({
      where: and(eq(jobOrders.sourceType, 'intake'), eq(jobOrders.sourceId, intakeId)),
      orderBy: [desc(jobOrders.createdAt), desc(jobOrders.id)],
    });
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
          with: {
            technicianProfile: true,
          },
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
          with: {
            technicianProfile: true,
          },
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
          with: {
            technicianProfile: true,
          },
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
          with: {
            technicianProfile: true,
          },
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
          with: {
            technicianProfile: true,
          },
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
          with: {
            technicianProfile: true,
          },
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

  async hasIntakeSource(sourceId: string) {
    const existing = await this.db.query.jobOrders.findFirst({
      columns: { id: true },
      where: and(eq(jobOrders.sourceType, 'intake'), eq(jobOrders.sourceId, sourceId)),
    });

    return Boolean(existing);
  }

  async findLatestByBookingSourceId(sourceId: string) {
    return this.db.query.jobOrders.findFirst({
      where: and(eq(jobOrders.sourceType, 'booking'), eq(jobOrders.sourceId, sourceId)),
      orderBy: [desc(jobOrders.updatedAt)],
      with: {
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
      },
    });
  }

  async hasBackJobSource(sourceId: string) {
    const existingJobOrder = await this.db.query.jobOrders.findFirst({
      where: and(eq(jobOrders.sourceType, 'back_job'), eq(jobOrders.sourceId, sourceId)),
    });

    return Boolean(existingJobOrder);
  }

  async updateStatus(id: string, payload: UpdateJobOrderStatusPersistenceInput) {
    const filters = [eq(jobOrders.id, id), ...createUpdatedAtMatchFilters(payload.expectedUpdatedAt)];

    const [updatedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(and(...filters))
      .returning();

    if (!updatedJobOrder && payload.expectedUpdatedAt) {
      throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
    }

    this.assertFound(updatedJobOrder, 'Job order not found');
    return this.findById(id);
  }

  async replaceAssignments(id: string, payload: ReplaceJobOrderAssignmentsPersistenceInput) {
    return this.db.transaction(async (tx) => {
      const existingJobOrder = await tx.query.jobOrders.findFirst({
        where: eq(jobOrders.id, id),
      });
      if (!existingJobOrder) {
        throw new NotFoundException('Job order not found');
      }
      if (
        !matchesUpdatedAtWithinMillisecond(existingJobOrder.updatedAt, payload.expectedUpdatedAt)
      ) {
        throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
      }

      await tx.delete(jobOrderAssignments).where(eq(jobOrderAssignments.jobOrderId, id));

      const nextAssignments = payload.assignments ?? [];

      if (nextAssignments.length > 0) {
        await tx.insert(jobOrderAssignments).values(
          nextAssignments.map((assignment) => ({
            jobOrderId: id,
            technicianProfileId: assignment.technicianProfileId,
            selectedSpecialty: assignment.selectedSpecialty,
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
          with: {
            technicianProfile: true,
          },
        },
        progressEntries: {
          orderBy: desc(jobOrderProgressLogs.createdAt),
        },
        photos: {
          orderBy: desc(jobOrderPhotos.createdAt),
        },
        invoiceRecord: {
          with: {
            lineItemSnapshots: {
              orderBy: [
                asc(jobOrderInvoiceLineItemSnapshots.invoiceVersion),
                asc(jobOrderInvoiceLineItemSnapshots.sortOrder),
              ],
            },
            correctionHistory: {
              orderBy: desc(jobOrderInvoiceCorrections.createdAt),
            },
          },
        },
      },
    });
  }

  async findByInvoiceOnlinePaymentSessionId(providerPaymentId: string) {
    const invoiceRecord = await this.db.query.jobOrderInvoiceRecords.findFirst({
      where: eq(jobOrderInvoiceRecords.onlinePaymentSessionId, providerPaymentId),
    });
    if (!invoiceRecord) {
      return null;
    }

    return this.findOptionalById(invoiceRecord.jobOrderId);
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
    payload: AddJobOrderProgressDto & {
      attachedPhotoIds?: string[];
      nextStatus?: 'in_progress' | 'blocked';
      nextWorkshopStage?: UpdateJobOrderWorkshopStageDto['stage'];
      recordedByUserId?: string;
      technicianProfileId?: string | null;
      workshopStage?: UpdateJobOrderWorkshopStageDto['stage'];
    },
    actorUserId: string,
  ) {
    const filters = [eq(jobOrders.id, id), ...createUpdatedAtMatchFilters(payload.expectedUpdatedAt)];

    const [touchedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        updatedAt: new Date(),
        ...(payload.nextStatus ? { status: payload.nextStatus } : {}),
        ...(payload.nextWorkshopStage ? { currentWorkshopStage: payload.nextWorkshopStage } : {}),
      })
      .where(and(...filters))
      .returning();

    if (!touchedJobOrder && payload.expectedUpdatedAt) {
      throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
    }

    this.assertFound(touchedJobOrder, 'Job order not found');

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
      technicianUserId: payload.recordedByUserId ? null : actorUserId,
      recordedByUserId: payload.recordedByUserId ?? actorUserId,
      technicianProfileId: payload.technicianProfileId ?? null,
      workshopStage: payload.workshopStage ?? null,
      workItemId: payload.workItemId ?? null,
      entryType: payload.entryType,
      message: payload.message,
      completedItemIds: payload.completedItemIds ?? [],
      attachedPhotoIds: payload.attachedPhotoIds ?? [],
    });

    return this.findById(id);
  }

  async updateWorkshopStage(id: string, payload: UpdateJobOrderWorkshopStagePersistenceInput) {
    const filters = [eq(jobOrders.id, id), ...createUpdatedAtMatchFilters(payload.expectedUpdatedAt)];

    const [touchedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        updatedAt: new Date(),
        currentWorkshopStage: payload.stage,
        ...(payload.nextStatus ? { status: payload.nextStatus } : {}),
      })
      .where(and(...filters))
      .returning();

    if (!touchedJobOrder && payload.expectedUpdatedAt) {
      throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
    }

    this.assertFound(touchedJobOrder, 'Job order not found');

    await this.db.insert(jobOrderProgressLogs).values({
      jobOrderId: id,
      technicianUserId: null,
      recordedByUserId: payload.recordedByUserId,
      technicianProfileId: null,
      workshopStage: payload.stage,
      entryType: 'stage_update',
      message: payload.note?.trim() || `Workshop stage updated to ${payload.stage.replace(/_/g, ' ')}`,
      completedItemIds: [],
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
    const filters = [eq(jobOrders.id, id), ...createUpdatedAtMatchFilters(payload.expectedUpdatedAt)];

    const [touchedJobOrder] = await this.db
      .update(jobOrders)
      .set({
        updatedAt: new Date(),
      })
      .where(and(...filters))
      .returning();

    if (!touchedJobOrder && payload.expectedUpdatedAt) {
      throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
    }

    this.assertFound(touchedJobOrder, 'Job order not found');

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
    return this.db.transaction(async (tx) => {
      const jobOrder = await this.findById(id, tx);
      if (!matchesUpdatedAtWithinMillisecond(jobOrder.updatedAt, payload.expectedUpdatedAt)) {
        throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
      }

      const [invoiceRecord] = await tx.insert(jobOrderInvoiceRecords).values({
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
      }).returning();
      const createdInvoice = this.assertFound(invoiceRecord, 'Job order invoice record not found');

      await tx.insert(jobOrderInvoiceLineItemSnapshots).values(
        payload.lineItemSnapshots.map((lineItem, sortOrder) => ({
          ...lineItem,
          invoiceRecordId: createdInvoice.id,
          invoiceVersion: 1,
          sortOrder,
        })),
      );

      const [updatedJobOrder] = await tx
        .update(jobOrders)
        .set({ status: 'finalized', updatedAt: new Date() })
        .where(eq(jobOrders.id, id))
        .returning();

      this.assertFound(updatedJobOrder, 'Job order not found');
      return this.findById(id, tx);
    });
  }

  async completeInvoicePaymentReversal(
    id: string,
    payload: CompleteInvoicePaymentReversalPersistenceInput,
  ) {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM job_order_invoice_records WHERE job_order_id = ${id} FOR UPDATE`);
      const invoice = await tx.query.jobOrderInvoiceRecords.findFirst({
        where: eq(jobOrderInvoiceRecords.jobOrderId, id),
        with: { lineItemSnapshots: true },
      });
      const currentInvoice = this.assertFound(invoice, 'Job order invoice record not found');
      const replay = await tx.query.jobOrderInvoiceCorrections.findFirst({
        where: and(
          eq(jobOrderInvoiceCorrections.invoiceRecordId, currentInvoice.id),
          eq(jobOrderInvoiceCorrections.idempotencyKey, payload.idempotencyKey),
        ),
      });
      if (replay) {
        if (replay.requestFingerprint !== payload.requestFingerprint) {
          throw new ConflictException({
            code: 'INVOICE_IDEMPOTENCY_CONFLICT',
            message: 'This Idempotency-Key was already used with a different invoice request.',
          });
        }
        return;
      }
      if (currentInvoice.version !== payload.expectedVersion) {
        throw new ConflictException({
          code: 'INVOICE_VERSION_CONFLICT',
          message: 'The invoice changed. Reload it and retry with the current version.',
          currentVersion: currentInvoice.version,
        });
      }
      if (currentInvoice.paymentStatus !== 'paid') {
        throw new ConflictException({
          code: 'PAYMENT_REVERSAL_NOT_APPLICABLE',
          message: 'Only a paid invoice can record a completed reversal or refund.',
        });
      }

      const nextVersion = currentInvoice.version + 1;
      const currentLines = currentInvoice.lineItemSnapshots.filter(
        (lineItem) => lineItem.invoiceVersion === currentInvoice.version,
      );
      const beforeSnapshot = { ...currentInvoice, lineItemSnapshots: currentLines };
      const afterSnapshot = {
        ...beforeSnapshot,
        version: nextVersion,
        paymentReversalStatus: 'completed',
        paymentReversalReference: payload.reversalReference,
        paymentReversalReason: payload.reason,
        paymentReversalCompletedAt: payload.completedAt,
        paymentReversalCompletedByUserId: payload.actorUserId,
      };

      await tx.update(jobOrderInvoiceRecords).set({
        version: nextVersion,
        paymentReversalStatus: 'completed',
        paymentReversalReference: payload.reversalReference,
        paymentReversalReason: payload.reason,
        paymentReversalCompletedAt: payload.completedAt,
        paymentReversalCompletedByUserId: payload.actorUserId,
        updatedAt: new Date(),
      }).where(eq(jobOrderInvoiceRecords.id, currentInvoice.id));

      if (currentLines.length > 0) {
        await tx.insert(jobOrderInvoiceLineItemSnapshots).values(
          currentLines.map((lineItem) => ({
            invoiceRecordId: currentInvoice.id,
            invoiceVersion: nextVersion,
            sourceJobOrderItemId: lineItem.sourceJobOrderItemId,
            category: lineItem.category,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitAmountCents: lineItem.unitAmountCents,
            lineAmountCents: lineItem.lineAmountCents,
            sortOrder: lineItem.sortOrder,
          })),
        );
      }

      await tx.insert(jobOrderInvoiceCorrections).values({
        invoiceRecordId: currentInvoice.id,
        lineageId: currentInvoice.lineageId,
        action: 'payment_reversal_completed',
        fromVersion: currentInvoice.version,
        toVersion: nextVersion,
        idempotencyKey: payload.idempotencyKey,
        requestFingerprint: payload.requestFingerprint,
        previousInvoiceReference: currentInvoice.invoiceReference,
        newInvoiceReference: currentInvoice.invoiceReference,
        reason: payload.reason,
        actorUserId: payload.actorUserId,
        beforeSnapshot,
        afterSnapshot,
      });
    });

    return this.findById(id);
  }

  async voidAndReissueInvoice(id: string, payload: VoidAndReissueInvoicePersistenceInput) {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM job_order_invoice_records WHERE job_order_id = ${id} FOR UPDATE`);
      const invoice = await tx.query.jobOrderInvoiceRecords.findFirst({
        where: eq(jobOrderInvoiceRecords.jobOrderId, id),
        with: { lineItemSnapshots: true },
      });
      const currentInvoice = this.assertFound(invoice, 'Job order invoice record not found');
      const replay = await tx.query.jobOrderInvoiceCorrections.findFirst({
        where: and(
          eq(jobOrderInvoiceCorrections.invoiceRecordId, currentInvoice.id),
          eq(jobOrderInvoiceCorrections.idempotencyKey, payload.idempotencyKey),
        ),
      });
      if (replay) {
        if (replay.requestFingerprint !== payload.requestFingerprint) {
          throw new ConflictException({
            code: 'INVOICE_IDEMPOTENCY_CONFLICT',
            message: 'This Idempotency-Key was already used with a different invoice request.',
          });
        }
        return;
      }
      if (currentInvoice.version !== payload.expectedVersion) {
        throw new ConflictException({
          code: 'INVOICE_VERSION_CONFLICT',
          message: 'The invoice changed. Reload it and retry with the current version.',
          currentVersion: currentInvoice.version,
        });
      }
      if (
        currentInvoice.paymentStatus === 'paid'
        && currentInvoice.paymentReversalStatus !== 'completed'
      ) {
        throw new ConflictException({
          code: 'PAYMENT_REVERSAL_REQUIRED',
          message: 'Complete and record the payment reversal or refund before voiding this paid invoice.',
          invoiceReference: currentInvoice.invoiceReference,
        });
      }

      const now = new Date();
      const nextVersion = currentInvoice.version + 1;
      const existingLines = currentInvoice.lineItemSnapshots.filter(
        (lineItem) => lineItem.invoiceVersion === currentInvoice.version,
      );
      const existingLineInputs = existingLines.map((lineItem) => ({
        sourceJobOrderItemId: lineItem.sourceJobOrderItemId,
        category: lineItem.category,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitAmountCents: lineItem.unitAmountCents,
        lineAmountCents: lineItem.lineAmountCents,
      }));
      const lineItems = payload.lineItemSnapshots
        ?? (existingLineInputs.length > 0
          ? existingLineInputs
          : [{
              sourceJobOrderItemId: null,
              category: 'service' as const,
              description: currentInvoice.summary || 'Service invoice',
              quantity: 1,
              unitAmountCents: currentInvoice.subtotalAmountCents,
              lineAmountCents: currentInvoice.subtotalAmountCents,
            }]);
      const subtotalAmountCents = payload.lineItemSnapshots
        ? lineItems.reduce((sum, lineItem) => sum + lineItem.lineAmountCents, 0)
        : currentInvoice.subtotalAmountCents;
      const laborAmountCents = payload.lineItemSnapshots
        ? lineItems.filter((lineItem) => ['service', 'labor', 'other'].includes(lineItem.category))
          .reduce((sum, lineItem) => sum + lineItem.lineAmountCents, 0)
        : currentInvoice.laborAmountCents;
      const partsAmountCents = payload.lineItemSnapshots
        ? lineItems.filter((lineItem) => lineItem.category === 'part')
          .reduce((sum, lineItem) => sum + lineItem.lineAmountCents, 0)
        : currentInvoice.partsAmountCents;
      const reservationFeeDeductionCents =
        payload.reservationFeeDeductionCents ?? currentInvoice.reservationFeeDeductionCents;
      const totalAmountCents = Math.max(subtotalAmountCents - reservationFeeDeductionCents, 0);
      const beforeSnapshot = { ...currentInvoice, lineItemSnapshots: existingLines };
      const afterSnapshot = {
        ...beforeSnapshot,
        version: nextVersion,
        invoiceReference: payload.invoiceReference,
        previousInvoiceReference: currentInvoice.invoiceReference,
        paymentStatus: 'pending_payment',
        subtotalAmountCents,
        laborAmountCents,
        partsAmountCents,
        reservationFeeDeductionCents,
        totalAmountCents,
        summary: payload.summary ?? currentInvoice.summary,
        lastVoidedAt: now,
        lastVoidedByUserId: payload.actorUserId,
        lastVoidReason: payload.reason,
        reissuedAt: now,
        reissuedByUserId: payload.actorUserId,
        lineItemSnapshots: lineItems,
      };

      await tx.update(jobOrderInvoiceRecords).set({
        version: nextVersion,
        lifecycleStatus: 'issued',
        invoiceReference: payload.invoiceReference,
        previousInvoiceReference: currentInvoice.invoiceReference,
        officialReceiptReference: payload.officialReceiptReference,
        paymentStatus: 'pending_payment',
        subtotalAmountCents,
        laborAmountCents,
        partsAmountCents,
        reservationFeeDeductionCents,
        totalAmountCents,
        amountPaidCents: null,
        paymentMethod: null,
        paymentChannel: null,
        paymentReference: null,
        paidAt: null,
        recordedByUserId: null,
        onlinePaymentProvider: null,
        onlinePaymentStatus: null,
        onlinePaymentSessionId: null,
        onlinePaymentCheckoutUrl: null,
        onlinePaymentReference: null,
        onlinePaymentPaidAt: null,
        onlinePaymentFailureReason: null,
        paymentReversalStatus: 'not_required',
        paymentReversalReference: null,
        paymentReversalReason: null,
        paymentReversalCompletedAt: null,
        paymentReversalCompletedByUserId: null,
        summary: payload.summary ?? currentInvoice.summary,
        lastVoidedAt: now,
        lastVoidedByUserId: payload.actorUserId,
        lastVoidReason: payload.reason,
        reissuedAt: now,
        reissuedByUserId: payload.actorUserId,
        pdfGeneratedAt: null,
        pdfEmailSentAt: null,
        pdfEmailError: null,
        updatedAt: now,
      }).where(eq(jobOrderInvoiceRecords.id, currentInvoice.id));

      if (lineItems.length > 0) {
        await tx.insert(jobOrderInvoiceLineItemSnapshots).values(
          lineItems.map((lineItem, sortOrder) => ({
            ...lineItem,
            invoiceRecordId: currentInvoice.id,
            invoiceVersion: nextVersion,
            sortOrder,
          })),
        );
      }

      await tx.insert(jobOrderInvoiceCorrections).values({
        invoiceRecordId: currentInvoice.id,
        lineageId: currentInvoice.lineageId,
        action: 'void_and_reissue',
        fromVersion: currentInvoice.version,
        toVersion: nextVersion,
        idempotencyKey: payload.idempotencyKey,
        requestFingerprint: payload.requestFingerprint,
        previousInvoiceReference: currentInvoice.invoiceReference,
        newInvoiceReference: payload.invoiceReference,
        reason: payload.reason,
        actorUserId: payload.actorUserId,
        beforeSnapshot,
        afterSnapshot,
      });
    });

    return this.findById(id);
  }

  async updateInvoiceRecord(id: string, payload: Partial<{
      paymentStatus: 'pending_payment' | 'paid';
      amountPaidCents: number | null;
      paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'other' | null;
      paymentChannel: 'manual' | 'online_provider' | null;
      paymentReference: string | null;
      onlinePaymentProvider: string | null;
      onlinePaymentStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'unavailable' | null;
      onlinePaymentSessionId: string | null;
      onlinePaymentCheckoutUrl: string | null;
      onlinePaymentReference: string | null;
      onlinePaymentPaidAt: Date | null;
      onlinePaymentFailureReason: string | null;
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
    if (!matchesUpdatedAtWithinMillisecond(jobOrder.updatedAt, payload.expectedUpdatedAt)) {
      throw new ConflictException('Another staff member already updated this job order. Reload and try again.');
    }
    const invoiceRecord = this.assertFound(jobOrder.invoiceRecord, 'Job order invoice record not found');

    const [updatedInvoiceRecord] = await this.db
      .update(jobOrderInvoiceRecords)
      .set({
        paymentStatus: 'paid',
          amountPaidCents: payload.amountPaidCents,
          paymentMethod: payload.paymentMethod,
          paymentChannel: 'manual',
          paymentReference: payload.reference ?? null,
          onlinePaymentStatus: null,
          onlinePaymentFailureReason: null,
          paidAt: payload.receivedAt,
          recordedByUserId: payload.recordedByUserId,
          updatedAt: new Date(),
      })
      .where(eq(jobOrderInvoiceRecords.id, invoiceRecord.id))
      .returning();

    this.assertFound(updatedInvoiceRecord, 'Job order invoice record not found');
    await this.db
      .update(jobOrders)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(jobOrders.id, id));
    return this.findById(id);
  }
}
