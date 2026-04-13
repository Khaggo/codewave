import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateJobOrderDto } from '../dto/create-job-order.dto';
import { AddJobOrderPhotoDto } from '../dto/add-job-order-photo.dto';
import { AddJobOrderProgressDto } from '../dto/add-job-order-progress.dto';
import { FinalizeJobOrderDto } from '../dto/finalize-job-order.dto';
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
type FinalizeJobOrderPersistenceInput = FinalizeJobOrderDto & {
  finalizedByUserId: string;
  invoiceReference: string;
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

  async findById(id: string) {
    const jobOrder = await this.db.query.jobOrders.findFirst({
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

  async addProgressEntry(
    id: string,
    payload: AddJobOrderProgressDto,
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
    });

    return this.findById(id);
  }

  async addPhoto(id: string, payload: AddJobOrderPhotoDto, takenByUserId: string) {
    await this.db.insert(jobOrderPhotos).values({
      jobOrderId: id,
      takenByUserId,
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
      sourceType: jobOrder.sourceType,
      sourceId: jobOrder.sourceId,
      customerUserId: jobOrder.customerUserId,
      vehicleId: jobOrder.vehicleId,
      serviceAdviserUserId: jobOrder.serviceAdviserUserId,
      serviceAdviserCode: jobOrder.serviceAdviserCode,
      finalizedByUserId: payload.finalizedByUserId,
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
}
