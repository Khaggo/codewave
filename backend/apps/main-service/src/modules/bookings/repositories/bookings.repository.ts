import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateServiceCategoryDto } from '../dto/create-service-category.dto';
import { CreateServiceDto } from '../dto/create-service.dto';
import { CreateTimeSlotDto } from '../dto/create-time-slot.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { UpdateTimeSlotDto } from '../dto/update-time-slot.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import {
  bookingServices,
  bookingPaymentPolicies,
  bookingReservationPayments,
  bookingReservationPaymentStatusEnum,
  bookings,
  bookingStatusHistory,
  bookingStatusEnum,
  serviceCategories,
  services,
  timeSlots,
} from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
type BookingReservationPaymentStatus =
  (typeof bookingReservationPaymentStatusEnum.enumValues)[number];
type UpdateBookingStatusPersistenceInput = UpdateBookingStatusDto & {
  changedByUserId?: string | null;
};
type RescheduleBookingPersistenceInput = RescheduleBookingDto & {
  changedByUserId?: string | null;
};

@Injectable()
export class BookingsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async listServices() {
    return this.db.select().from(services).orderBy(asc(services.name));
  }

  async listServiceCategories() {
    return this.db.select().from(serviceCategories).orderBy(asc(serviceCategories.name));
  }

  async findServiceCategoryById(id: string) {
    return this.db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.id, id),
    });
  }

  async findServiceCategoryByName(name: string) {
    return this.db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.name, name),
    });
  }

  async findServiceByName(name: string) {
    return this.db.query.services.findFirst({
      where: eq(services.name, name),
    });
  }

  async createServiceCategory(payload: CreateServiceCategoryDto) {
    const [createdCategory] = await this.db
      .insert(serviceCategories)
      .values({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        isActive: true,
      })
      .returning();

    return createdCategory;
  }

  async createService(payload: CreateServiceDto) {
    const [createdService] = await this.db
      .insert(services)
      .values({
        categoryId: payload.categoryId ?? null,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        durationMinutes: payload.durationMinutes,
        isActive: payload.isActive ?? true,
      })
      .returning();

    return createdService;
  }

  async listTimeSlots() {
    return this.db
      .select()
      .from(timeSlots)
      .where(isNull(timeSlots.deletedAt))
      .orderBy(asc(timeSlots.startTime));
  }

  async findServiceIds(serviceIds: string[]) {
    return this.db
      .select({ id: services.id })
      .from(services)
      .where(and(inArray(services.id, serviceIds), eq(services.isActive, true)));
  }

  async findTimeSlotById(id: string) {
    return this.db.query.timeSlots.findFirst({
      where: eq(timeSlots.id, id),
    });
  }

  async createTimeSlot(payload: CreateTimeSlotDto) {
    const [createdTimeSlot] = await this.db
      .insert(timeSlots)
      .values({
        label: payload.label.trim(),
        startTime: payload.startTime,
        endTime: payload.endTime,
        capacity: payload.capacity,
        isActive: payload.isActive ?? true,
      })
      .returning();

    return createdTimeSlot;
  }

  async updateTimeSlot(id: string, payload: UpdateTimeSlotDto) {
    const [updatedTimeSlot] = await this.db
      .update(timeSlots)
      .set({
        ...(payload.label !== undefined ? { label: payload.label.trim() } : {}),
        ...(payload.startTime !== undefined ? { startTime: payload.startTime } : {}),
        ...(payload.endTime !== undefined ? { endTime: payload.endTime } : {}),
        ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(timeSlots.id, id))
      .returning();

    return this.assertFound(updatedTimeSlot, 'Time slot not found');
  }

  async archiveTimeSlot(id: string) {
    const [archivedTimeSlot] = await this.db
      .update(timeSlots)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timeSlots.id, id))
      .returning();

    return this.assertFound(archivedTimeSlot, 'Time slot not found');
  }

  async countActiveBookingsForSlot(timeSlotId: string, scheduledDate: string, excludeBookingId?: string) {
    const filters = [
      eq(bookings.timeSlotId, timeSlotId),
      eq(bookings.scheduledDate, scheduledDate),
      inArray(
        bookings.status,
        ['pending', 'pending_payment', 'confirmed', 'in_service', 'rescheduled'] as BookingStatus[],
      ),
    ];

    if (excludeBookingId) {
      filters.push(ne(bookings.id, excludeBookingId));
    }

    const rows = await this.db.query.bookings.findMany({
      where: and(...filters),
    });

    return rows.length;
  }

  async findByScheduledDateRange(
    startDate: string,
    endDate: string,
    options?: {
      timeSlotId?: string;
      statuses?: BookingStatus[];
    },
  ) {
    const filters = [gte(bookings.scheduledDate, startDate), lte(bookings.scheduledDate, endDate)];

    if (options?.timeSlotId) {
      filters.push(eq(bookings.timeSlotId, options.timeSlotId));
    }

    if (options?.statuses?.length) {
      filters.push(inArray(bookings.status, options.statuses));
    }

    return this.db
      .select({
        id: bookings.id,
        timeSlotId: bookings.timeSlotId,
        scheduledDate: bookings.scheduledDate,
        status: bookings.status,
      })
      .from(bookings)
      .where(and(...filters))
      .orderBy(asc(bookings.scheduledDate), asc(bookings.createdAt));
  }

  async create(createBookingDto: CreateBookingDto) {
    const [createdBooking] = await this.db
      .insert(bookings)
      .values({
        userId: createBookingDto.userId,
        vehicleId: createBookingDto.vehicleId,
        timeSlotId: createBookingDto.timeSlotId,
        scheduledDate: createBookingDto.scheduledDate,
        status: 'pending_payment',
        notes: createBookingDto.notes ?? null,
      })
      .returning();

    await this.db.insert(bookingServices).values(
      createBookingDto.serviceIds.map((serviceId) => ({
        bookingId: createdBooking.id,
        serviceId,
      })),
    );

    await this.db.insert(bookingStatusHistory).values({
      bookingId: createdBooking.id,
      previousStatus: null,
      nextStatus: 'pending_payment',
      reason: 'Booking created and awaiting reservation payment',
      changedByUserId: createBookingDto.userId,
    });

    return this.findById(createdBooking.id);
  }

  async findById(id: string) {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
    });

    return this.assertFound(booking, 'Booking not found');
  }

  async findOptionalById(id: string) {
    return this.db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
      orderBy: desc(bookings.createdAt),
    });
  }

  async findByScheduledDate(
    scheduledDate: string,
    options?: {
      timeSlotId?: string;
      statuses?: BookingStatus[];
    },
  ) {
    const filters = [eq(bookings.scheduledDate, scheduledDate)];

    if (options?.timeSlotId) {
      filters.push(eq(bookings.timeSlotId, options.timeSlotId));
    }

    if (options?.statuses?.length) {
      filters.push(inArray(bookings.status, options.statuses));
    }

    return this.db.query.bookings.findMany({
      where: and(...filters),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
      orderBy: [asc(bookings.scheduledDate), asc(bookings.createdAt)],
    });
  }

  async findScheduledDatesByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    return this.db
      .select({
        id: bookings.id,
        scheduledDate: bookings.scheduledDate,
      })
      .from(bookings)
      .where(inArray(bookings.id, ids));
  }

  async findDetailedByScheduledDateRange(
    startDate: string,
    endDate: string,
    options?: {
      statuses?: BookingStatus[];
    },
  ) {
    const filters = [gte(bookings.scheduledDate, startDate), lte(bookings.scheduledDate, endDate)];

    if (options?.statuses?.length) {
      filters.push(inArray(bookings.status, options.statuses));
    }

    return this.db.query.bookings.findMany({
      where: and(...filters),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        vehicle: true,
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
      orderBy: [asc(bookings.scheduledDate), asc(bookings.createdAt)],
    });
  }

  async findByVehicleId(vehicleId: string) {
    return this.db.query.bookings.findMany({
      where: eq(bookings.vehicleId, vehicleId),
      with: {
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
        reservationPayment: true,
        statusHistory: {
          orderBy: desc(bookingStatusHistory.changedAt),
        },
      },
      orderBy: desc(bookings.createdAt),
    });
  }

  async listForAnalytics() {
    return this.db.query.bookings.findMany({
      with: {
        timeSlot: true,
        requestedServices: {
          with: {
            service: true,
          },
        },
      },
      orderBy: [desc(bookings.createdAt), desc(bookings.id)],
    });
  }

  async updateStatus(id: string, payload: UpdateBookingStatusPersistenceInput) {
    const currentBooking = await this.findById(id);

    const [updatedBooking] = await this.db
      .update(bookings)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    this.assertFound(updatedBooking, 'Booking not found');

    await this.db.insert(bookingStatusHistory).values({
      bookingId: id,
      previousStatus: currentBooking.status,
      nextStatus: payload.status,
      reason: payload.reason ?? null,
      changedByUserId: payload.changedByUserId ?? null,
    });

    return this.findById(id);
  }

  async reschedule(id: string, payload: RescheduleBookingPersistenceInput) {
    const currentBooking = await this.findById(id);

    const [updatedBooking] = await this.db
      .update(bookings)
      .set({
        timeSlotId: payload.timeSlotId,
        scheduledDate: payload.scheduledDate,
        status: 'rescheduled',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    this.assertFound(updatedBooking, 'Booking not found');

    await this.db.insert(bookingStatusHistory).values({
      bookingId: id,
      previousStatus: currentBooking.status,
      nextStatus: 'rescheduled',
      reason: payload.reason ?? null,
      changedByUserId: payload.changedByUserId ?? null,
    });

    return this.findById(id);
  }

  async getOrCreatePaymentPolicy() {
    const existingPolicy = await this.db.query.bookingPaymentPolicies.findFirst({
      orderBy: desc(bookingPaymentPolicies.updatedAt),
    });

    if (existingPolicy) {
      return existingPolicy;
    }

    const [createdPolicy] = await this.db
      .insert(bookingPaymentPolicies)
      .values({})
      .returning();

    return this.assertFound(createdPolicy, 'Booking payment policy not found');
  }

  async updatePaymentPolicy(payload: {
    reservationFeeAmountCents?: number;
    currencyCode?: string;
    onlineExpiryWindowMinutes?: number;
    counterExpiryWindowMinutes?: number;
  }) {
    const currentPolicy = await this.getOrCreatePaymentPolicy();

    const [updatedPolicy] = await this.db
      .update(bookingPaymentPolicies)
      .set({
        reservationFeeAmountCents:
          payload.reservationFeeAmountCents ?? currentPolicy.reservationFeeAmountCents,
        currencyCode: payload.currencyCode ?? currentPolicy.currencyCode,
        onlineExpiryWindowMinutes:
          payload.onlineExpiryWindowMinutes ?? currentPolicy.onlineExpiryWindowMinutes,
        counterExpiryWindowMinutes:
          payload.counterExpiryWindowMinutes ?? currentPolicy.counterExpiryWindowMinutes,
        updatedAt: new Date(),
      })
      .where(eq(bookingPaymentPolicies.id, currentPolicy.id))
      .returning();

    return this.assertFound(updatedPolicy, 'Booking payment policy not found');
  }

  async createOrReplaceReservationPayment(payload: {
    bookingId: string;
    provider: 'paymongo' | 'manual_counter';
    status: BookingReservationPaymentStatus;
    amountCents: number;
    currencyCode: string;
    providerPaymentId?: string | null;
    providerCheckoutUrl?: string | null;
    referenceNumber?: string | null;
    failureReason?: string | null;
    expiresAt?: Date | null;
    paidAt?: Date | null;
    refundedAt?: Date | null;
    confirmedByUserId?: string | null;
    refundStatus?: 'not_required' | 'pending_review' | 'processing' | 'completed';
    auditMetadata?: string | null;
  }) {
    const existing = await this.db.query.bookingReservationPayments.findFirst({
      where: eq(bookingReservationPayments.bookingId, payload.bookingId),
    });

    if (existing) {
      const [updated] = await this.db
        .update(bookingReservationPayments)
        .set({
          provider: payload.provider,
          status: payload.status,
          amountCents: payload.amountCents,
          currencyCode: payload.currencyCode,
          providerPaymentId: payload.providerPaymentId ?? null,
          providerCheckoutUrl: payload.providerCheckoutUrl ?? null,
          referenceNumber: payload.referenceNumber ?? null,
          failureReason: payload.failureReason ?? null,
          expiresAt: payload.expiresAt ?? null,
          paidAt: payload.paidAt ?? null,
          refundedAt: payload.refundedAt ?? null,
          confirmedByUserId: payload.confirmedByUserId ?? null,
          refundStatus: payload.refundStatus ?? existing.refundStatus,
          auditMetadata: payload.auditMetadata ?? null,
          updatedAt: new Date(),
        })
        .where(eq(bookingReservationPayments.id, existing.id))
        .returning();

      return this.assertFound(updated, 'Booking reservation payment not found');
    }

    const [created] = await this.db
      .insert(bookingReservationPayments)
      .values({
        bookingId: payload.bookingId,
        provider: payload.provider,
        status: payload.status,
        amountCents: payload.amountCents,
        currencyCode: payload.currencyCode,
        providerPaymentId: payload.providerPaymentId ?? null,
        providerCheckoutUrl: payload.providerCheckoutUrl ?? null,
        referenceNumber: payload.referenceNumber ?? null,
        failureReason: payload.failureReason ?? null,
        expiresAt: payload.expiresAt ?? null,
        paidAt: payload.paidAt ?? null,
        refundedAt: payload.refundedAt ?? null,
        confirmedByUserId: payload.confirmedByUserId ?? null,
        refundStatus: payload.refundStatus ?? 'not_required',
        auditMetadata: payload.auditMetadata ?? null,
      })
      .returning();

    return this.assertFound(created, 'Booking reservation payment not found');
  }

  async updateBookingQrCode(bookingId: string, qrCodeToken: string) {
    const [updatedBooking] = await this.db
      .update(bookings)
      .set({
        qrCodeToken,
        qrCodeIssuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return this.assertFound(updatedBooking, 'Booking not found');
  }
}
