import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateBookingDateClosureDto } from '../dto/create-booking-date-closure.dto';
import { CreateServiceCategoryDto } from '../dto/create-service-category.dto';
import { CreateServiceDto } from '../dto/create-service.dto';
import { CreateTimeSlotDto } from '../dto/create-time-slot.dto';
import { ListServiceManagementQueryDto, ServiceManagementStatus } from '../dto/list-service-management-query.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { UpdateBookingDateClosureDto } from '../dto/update-booking-date-closure.dto';
import { UpdateServiceCategoryDto } from '../dto/update-service-category.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { UpdateTimeSlotDto } from '../dto/update-time-slot.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import {
  bookingDateClosures,
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

const isMissingBookingDateClosuresTableError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '42P01';

const isUniqueViolationError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505';

const buildBookingReference = (scheduledDate: string, sequenceNumber: number) =>
  `BK-${String(scheduledDate ?? '').slice(0, 10).replace(/-/g, '')}-${String(Math.max(1, sequenceNumber)).padStart(4, '0')}`;

@Injectable()
export class BookingsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async listServices() {
    return this.db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.name));
  }

  async listServiceManagement(query: ListServiceManagementQueryDto) {
    const filters = [];
    const search = query.search?.trim();

    if (search) {
      const searchPattern = `%${search}%`;
      filters.push(or(ilike(services.name, searchPattern), ilike(services.description, searchPattern)));
    }
    if (query.categoryId) {
      filters.push(eq(services.categoryId, query.categoryId));
    }
    if (query.status === ServiceManagementStatus.Active) {
      filters.push(eq(services.isActive, true));
    } else if (query.status === ServiceManagementStatus.Inactive) {
      filters.push(eq(services.isActive, false));
    }

    const where = filters.length ? and(...filters) : undefined;
    const offset = (query.page - 1) * query.limit;
    const [items, countRows] = await Promise.all([
      this.db
        .select()
        .from(services)
        .where(where)
        .orderBy(asc(services.name))
        .limit(query.limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` }).from(services).where(where),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
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
      where: ilike(serviceCategories.name, name),
    });
  }

  async findServiceByName(name: string) {
    return this.db.query.services.findFirst({
      where: ilike(services.name, name),
    });
  }

  async findServiceById(id: string) {
    return this.db.query.services.findFirst({
      where: eq(services.id, id),
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
        basePriceCents: payload.basePriceCents,
        durationMinutes: payload.durationMinutes,
        isActive: payload.isActive ?? true,
      })
      .returning();

    return createdService;
  }

  async updateServiceCategory(id: string, payload: UpdateServiceCategoryDto) {
    const [updatedCategory] = await this.db
      .update(serviceCategories)
      .set({
        name: payload.name?.trim(),
        description: payload.description !== undefined ? payload.description?.trim() || null : undefined,
        isActive: payload.isActive,
        updatedAt: new Date(),
      })
      .where(eq(serviceCategories.id, id))
      .returning();

    return updatedCategory ?? null;
  }

  async updateService(id: string, payload: UpdateServiceDto) {
    const [updatedService] = await this.db
      .update(services)
      .set({
        categoryId: payload.categoryId !== undefined ? payload.categoryId ?? null : undefined,
        name: payload.name?.trim(),
        description: payload.description !== undefined ? payload.description?.trim() || null : undefined,
        basePriceCents: payload.basePriceCents,
        durationMinutes: payload.durationMinutes,
        isActive: payload.isActive,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return updatedService ?? null;
  }

  async listTimeSlots() {
    return this.db
      .select()
      .from(timeSlots)
      .where(isNull(timeSlots.deletedAt))
      .orderBy(asc(timeSlots.startTime));
  }

  async findDateClosureByScheduledDate(scheduledDate: string) {
    try {
      return this.db.query.bookingDateClosures.findFirst({
        where: eq(bookingDateClosures.scheduledDate, scheduledDate),
      });
    } catch (error) {
      if (isMissingBookingDateClosuresTableError(error)) {
        return null;
      }

      throw error;
    }
  }

  async findDateClosuresInRange(startDate: string, endDate: string) {
    try {
      return this.db
        .select()
        .from(bookingDateClosures)
        .where(
          and(
            gte(bookingDateClosures.scheduledDate, startDate),
            lte(bookingDateClosures.scheduledDate, endDate),
            eq(bookingDateClosures.isClosed, true),
          ),
        )
        .orderBy(asc(bookingDateClosures.scheduledDate));
    } catch (error) {
      if (isMissingBookingDateClosuresTableError(error)) {
        return [];
      }

      throw error;
    }
  }

  async upsertDateClosure(
    payload: CreateBookingDateClosureDto,
    actorUserId?: string | null,
  ) {
    try {
      const [closure] = await this.db
        .insert(bookingDateClosures)
        .values({
          scheduledDate: payload.scheduledDate,
          label: payload.label?.trim() || null,
          reason: payload.reason.trim(),
          isClosed: payload.isClosed ?? true,
          createdByUserId: actorUserId ?? null,
          updatedByUserId: actorUserId ?? null,
        })
        .onConflictDoUpdate({
          target: bookingDateClosures.scheduledDate,
          set: {
            label: payload.label?.trim() || null,
            reason: payload.reason.trim(),
            isClosed: payload.isClosed ?? true,
            updatedByUserId: actorUserId ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return this.assertFound(closure, 'Booking closure could not be saved');
    } catch (error) {
      if (isMissingBookingDateClosuresTableError(error)) {
        throw new Error(
          'Booking closure storage is unavailable until the database schema is updated.',
        );
      }

      throw error;
    }
  }

  async updateDateClosure(
    scheduledDate: string,
    payload: UpdateBookingDateClosureDto,
    actorUserId?: string | null,
  ) {
    try {
      const [closure] = await this.db
        .update(bookingDateClosures)
        .set({
          ...(payload.label !== undefined ? { label: payload.label.trim() || null } : {}),
          ...(payload.reason !== undefined ? { reason: payload.reason.trim() } : {}),
          ...(payload.isClosed !== undefined ? { isClosed: payload.isClosed } : {}),
          updatedByUserId: actorUserId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(bookingDateClosures.scheduledDate, scheduledDate))
        .returning();

      return this.assertFound(closure, 'Booking closure not found');
    } catch (error) {
      if (isMissingBookingDateClosuresTableError(error)) {
        throw new Error(
          'Booking closure storage is unavailable until the database schema is updated.',
        );
      }

      throw error;
    }
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

  async findActiveBookingsForUserInRange(userId: string, startDate: string, endDate: string) {
    return this.db.query.bookings.findMany({
      where: and(
        eq(bookings.userId, userId),
        gte(bookings.scheduledDate, startDate),
        lte(bookings.scheduledDate, endDate),
        inArray(
          bookings.status,
          ['pending', 'pending_payment', 'confirmed', 'in_service', 'rescheduled'] as BookingStatus[],
        ),
      ),
      columns: {
        id: true,
        timeSlotId: true,
        scheduledDate: true,
        status: true,
      },
      orderBy: [asc(bookings.scheduledDate), asc(bookings.createdAt)],
    });
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

    await this.assignBookingReference(createdBooking.id, createdBooking.scheduledDate);

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

  async assignBookingReference(bookingId: string, scheduledDate: string) {
    const sameDayBookings = await this.db
      .select({
        id: bookings.id,
        bookingReference: bookings.bookingReference,
      })
      .from(bookings)
      .where(eq(bookings.scheduledDate, scheduledDate))
      .orderBy(asc(bookings.createdAt), asc(bookings.id));

    const currentBooking = sameDayBookings.find((booking) => booking.id === bookingId);
    if (currentBooking?.bookingReference) {
      return currentBooking.bookingReference;
    }

    let sequenceNumber = sameDayBookings.findIndex((booking) => booking.id === bookingId) + 1;
    if (sequenceNumber <= 0) {
      sequenceNumber = sameDayBookings.length + 1;
    }

    while (sameDayBookings.some((booking) => booking.bookingReference === buildBookingReference(scheduledDate, sequenceNumber))) {
      sequenceNumber += 1;
    }

    while (sequenceNumber < 100_000) {
      const bookingReference = buildBookingReference(scheduledDate, sequenceNumber);

      try {
        const [updatedBooking] = await this.db
          .update(bookings)
          .set({
            bookingReference,
            updatedAt: new Date(),
          })
          .where(and(eq(bookings.id, bookingId), isNull(bookings.bookingReference)))
          .returning({
            bookingReference: bookings.bookingReference,
          });

        if (updatedBooking?.bookingReference) {
          return updatedBooking.bookingReference;
        }

        const existingBooking = await this.db.query.bookings.findFirst({
          where: eq(bookings.id, bookingId),
          columns: {
            bookingReference: true,
          },
        });

        if (existingBooking?.bookingReference) {
          return existingBooking.bookingReference;
        }
      } catch (error) {
        if (isUniqueViolationError(error)) {
          sequenceNumber += 1;
          continue;
        }

        throw error;
      }

      sequenceNumber += 1;
    }

    throw new Error(`Booking reference could not be assigned for booking ${bookingId}`);
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

  async findByReservationProviderPaymentId(providerPaymentId: string) {
    const reservationPayment = await this.db.query.bookingReservationPayments.findFirst({
      where: eq(bookingReservationPayments.providerPaymentId, providerPaymentId),
    });

    if (!reservationPayment) {
      return null;
    }

    return this.findOptionalById(reservationPayment.bookingId);
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

  async findBookingReadModelByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    return this.db
      .select({
        id: bookings.id,
        scheduledDate: bookings.scheduledDate,
        bookingReference: bookings.bookingReference,
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

  async findPastDueOpenBookings(beforeDate: string, statuses: BookingStatus[]) {
    if (!statuses.length) {
      return [];
    }

    return this.db.query.bookings.findMany({
      where: and(lte(bookings.scheduledDate, beforeDate), inArray(bookings.status, statuses)),
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
