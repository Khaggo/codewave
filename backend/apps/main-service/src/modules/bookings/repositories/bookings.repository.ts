import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateTimeSlotDto } from '../dto/create-time-slot.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { UpdateTimeSlotDto } from '../dto/update-time-slot.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import {
  bookingServices,
  bookings,
  bookingStatusHistory,
  bookingStatusEnum,
  services,
  timeSlots,
} from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
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

  async listTimeSlots() {
    return this.db.select().from(timeSlots).orderBy(asc(timeSlots.startTime));
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

  async countActiveBookingsForSlot(timeSlotId: string, scheduledDate: string, excludeBookingId?: string) {
    const filters = [
      eq(bookings.timeSlotId, timeSlotId),
      eq(bookings.scheduledDate, scheduledDate),
      inArray(bookings.status, ['pending', 'confirmed', 'rescheduled'] as BookingStatus[]),
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
        status: 'pending',
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
      nextStatus: 'pending',
      reason: 'Booking created',
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
}
