import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';

import {
  BOOKING_ACTIVE_CAPACITY_STATUSES,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MAX_QUERY_WINDOW_DAYS,
  BOOKING_MIN_LEAD_DAYS,
  BOOKINGS_CLOCK,
  type BookingsClock,
  bookingAvailabilityDayStatusValues,
  bookingAvailabilitySlotStatusValues,
} from '../bookings.constants';
import { BookingAvailabilityQueryDto } from '../dto/booking-availability-query.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateTimeSlotDto } from '../dto/create-time-slot.dto';
import { DailyScheduleQueryDto } from '../dto/daily-schedule-query.dto';
import { QueueCurrentQueryDto } from '../dto/queue-current-query.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
import { UpdateTimeSlotDto } from '../dto/update-time-slot.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import { BookingsRepository } from '../repositories/bookings.repository';
import { bookingStatusEnum } from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
type UpdateBookingStatusCommand = UpdateBookingStatusDto & {
  changedByUserId?: string | null;
};
type RescheduleBookingCommand = RescheduleBookingDto & {
  changedByUserId?: string | null;
};

const allowedStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled', 'rescheduled'],
  confirmed: ['completed', 'cancelled', 'rescheduled'],
  declined: [],
  rescheduled: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) {
    return null;
  }

  const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const formatDateOnly = (value: Date) =>
  [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');

const getDateDiffInDays = (start: Date, end: Date) =>
  Math.floor((toDateOnly(end).getTime() - toDateOnly(start).getTime()) / MILLISECONDS_PER_DAY);

const enumerateDateRange = (startDate: string, endDate: string) => {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly usersService: UsersService,
    private readonly vehiclesRepository: VehiclesRepository,
    @Optional() @Inject(BOOKINGS_CLOCK) private readonly bookingsClock?: BookingsClock,
  ) {}

  async listServices() {
    return this.bookingsRepository.listServices();
  }

  async listTimeSlots() {
    return this.bookingsRepository.listTimeSlots();
  }

  async getAvailability(query: BookingAvailabilityQueryDto) {
    const { startDate, endDate, timeSlotId } = this.normalizeAvailabilityQuery(query);
    const { minBookableDate, maxBookableDate } = this.getBookingWindowBounds();
    const activeTimeSlots = await this.listActiveAvailabilitySlots(timeSlotId);
    const activeBookings = activeTimeSlots.length
      ? await this.bookingsRepository.findByScheduledDateRange(startDate, endDate, {
          timeSlotId,
          statuses: [...BOOKING_ACTIVE_CAPACITY_STATUSES] as BookingStatus[],
        })
      : [];

    const bookingCountsBySlotAndDate = new Map<string, number>();
    activeBookings.forEach((booking) => {
      const key = `${booking.scheduledDate}:${booking.timeSlotId}`;
      bookingCountsBySlotAndDate.set(key, (bookingCountsBySlotAndDate.get(key) ?? 0) + 1);
    });

    const days = enumerateDateRange(startDate, endDate).map((scheduledDate) => {
      const isWithinBookableWindow =
        scheduledDate >= minBookableDate && scheduledDate <= maxBookableDate;

      if (!isWithinBookableWindow) {
        return {
          scheduledDate,
          status: 'outside_window' as (typeof bookingAvailabilityDayStatusValues)[number],
          isBookable: false,
          activeSlotCount: 0,
          availableSlotCount: 0,
          totalCapacity: 0,
          remainingCapacity: 0,
          slots: [],
        };
      }

      if (!activeTimeSlots.length) {
        return {
          scheduledDate,
          status: 'no_active_slots' as (typeof bookingAvailabilityDayStatusValues)[number],
          isBookable: false,
          activeSlotCount: 0,
          availableSlotCount: 0,
          totalCapacity: 0,
          remainingCapacity: 0,
          slots: [],
        };
      }

      const slots = activeTimeSlots.map((timeSlot) => {
        const bookingCount = bookingCountsBySlotAndDate.get(`${scheduledDate}:${timeSlot.id}`) ?? 0;
        const remainingCapacity = Math.max(0, timeSlot.capacity - bookingCount);
        const isAvailable = remainingCapacity > 0;

        return {
          timeSlotId: timeSlot.id,
          label: timeSlot.label,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          capacity: timeSlot.capacity,
          bookingCount,
          remainingCapacity,
          status: (isAvailable ? 'available' : 'full') as (typeof bookingAvailabilitySlotStatusValues)[number],
          isAvailable,
        };
      });

      const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
      const remainingCapacity = slots.reduce((sum, slot) => sum + slot.remainingCapacity, 0);
      const availableSlotCount = slots.filter((slot) => slot.isAvailable).length;
      const status: (typeof bookingAvailabilityDayStatusValues)[number] =
        availableSlotCount === 0
          ? 'full'
          : remainingCapacity < totalCapacity
            ? 'limited'
            : 'bookable';

      return {
        scheduledDate,
        status,
        isBookable: availableSlotCount > 0,
        activeSlotCount: slots.length,
        availableSlotCount,
        totalCapacity,
        remainingCapacity,
        slots,
      };
    });

    return {
      generatedAt: this.getCurrentDate().toISOString(),
      startDate,
      endDate,
      minBookableDate,
      maxBookableDate,
      days,
    };
  }

  async createTimeSlot(payload: CreateTimeSlotDto, actorUserId: string) {
    await this.assertStaffActor(actorUserId);
    this.assertTimeWindow(payload.startTime, payload.endTime);

    return this.bookingsRepository.createTimeSlot(payload);
  }

  async updateTimeSlot(id: string, payload: UpdateTimeSlotDto, actorUserId: string) {
    await this.assertStaffActor(actorUserId);
    const existingTimeSlot = await this.bookingsRepository.findTimeSlotById(id);

    if (!existingTimeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    this.assertTimeWindow(
      payload.startTime ?? existingTimeSlot.startTime,
      payload.endTime ?? existingTimeSlot.endTime,
    );

    return this.bookingsRepository.updateTimeSlot(id, payload);
  }

  async create(createBookingDto: CreateBookingDto) {
    await this.assertUserExists(createBookingDto.userId);
    await this.assertVehicleOwnership(createBookingDto.userId, createBookingDto.vehicleId);
    await this.assertServicesExist(createBookingDto.serviceIds);
    await this.assertTimeSlotAvailability(createBookingDto.timeSlotId, createBookingDto.scheduledDate);

    const booking = await this.bookingsRepository.create(createBookingDto);
    return this.toBookingView(booking);
  }

  async findById(id: string) {
    const booking = await this.bookingsRepository.findById(id);
    return this.toBookingView(booking);
  }

  async findByUserId(userId: string) {
    await this.assertUserExists(userId);
    const bookings = await this.bookingsRepository.findByUserId(userId);
    return bookings.map((booking) => this.toBookingView(booking));
  }

  async updateStatus(id: string, payload: UpdateBookingStatusDto, actorUserId: string) {
    await this.assertStaffActor(actorUserId);
    const booking = await this.bookingsRepository.findById(id);

    if (booking.status === payload.status) {
      throw new BadRequestException('Booking is already in the requested status');
    }

    if (!allowedStatusTransitions[booking.status].includes(payload.status)) {
      throw new ConflictException(`Cannot transition booking from ${booking.status} to ${payload.status}`);
    }

    const command: UpdateBookingStatusCommand = {
      ...payload,
      changedByUserId: actorUserId,
    };

    const updatedBooking = await this.bookingsRepository.updateStatus(id, command);
    return this.toBookingView(updatedBooking);
  }

  async reschedule(id: string, payload: RescheduleBookingDto, actorUserId: string) {
    await this.assertStaffActor(actorUserId);
    const booking = await this.bookingsRepository.findById(id);

    if (!allowedStatusTransitions[booking.status].includes('rescheduled')) {
      throw new ConflictException(`Cannot reschedule a booking in ${booking.status} status`);
    }

    await this.assertTimeSlotAvailability(payload.timeSlotId, payload.scheduledDate, booking.id);
    const command: RescheduleBookingCommand = {
      ...payload,
      changedByUserId: actorUserId,
    };

    const updatedBooking = await this.bookingsRepository.reschedule(id, command);
    return this.toBookingView(updatedBooking);
  }

  async getDailySchedule(query: DailyScheduleQueryDto) {
    const statuses = query.status ? [query.status] : undefined;
    const [slots, scheduleBookings] = await Promise.all([
      this.bookingsRepository.listTimeSlots(),
      this.bookingsRepository.findByScheduledDate(query.scheduledDate, {
        timeSlotId: query.timeSlotId,
        statuses,
      }),
    ]);

    const filteredSlots = query.timeSlotId
      ? slots.filter((slot) => slot.id === query.timeSlotId)
      : slots;

    return {
      scheduledDate: query.scheduledDate,
      slots: filteredSlots.map((slot) => {
        const slotBookings = scheduleBookings
          .filter((booking) => booking.timeSlotId === slot.id)
          .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

        return {
          timeSlotId: slot.id,
          label: slot.label,
          totalCapacity: slot.capacity,
          confirmedCount: slotBookings.filter((booking) => booking.status === 'confirmed').length,
          pendingCount: slotBookings.filter((booking) => booking.status === 'pending').length,
          rescheduledCount: slotBookings.filter((booking) => booking.status === 'rescheduled').length,
          bookings: slotBookings.map((booking) => this.toBookingView(booking)),
        };
      }),
    };
  }

  async getQueueCurrent(query: QueueCurrentQueryDto) {
    const scheduledDate = query.scheduledDate ?? formatDateOnly(toDateOnly(this.getCurrentDate()));
    const queueBookings = await this.bookingsRepository.findByScheduledDate(scheduledDate, {
      timeSlotId: query.timeSlotId,
      statuses: ['confirmed', 'rescheduled'],
    });

    const items = queueBookings
      .sort((left, right) => {
        const leftTimeSlot = Array.isArray(left.timeSlot) ? left.timeSlot[0] : left.timeSlot;
        const rightTimeSlot = Array.isArray(right.timeSlot) ? right.timeSlot[0] : right.timeSlot;
        const leftSlot = leftTimeSlot?.startTime ?? '';
        const rightSlot = rightTimeSlot?.startTime ?? '';
        if (leftSlot !== rightSlot) {
          return leftSlot.localeCompare(rightSlot);
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      })
      .map((booking, index) => {
        const timeSlot = Array.isArray(booking.timeSlot) ? booking.timeSlot[0] : booking.timeSlot;

        return {
          queuePosition: index + 1,
          bookingId: booking.id,
          userId: booking.userId,
          vehicleId: booking.vehicleId,
          customerName: this.getCustomerDisplayName(booking.user),
          customerEmail: booking.user?.email ?? null,
          vehicleDisplayName: this.getVehicleDisplayName(booking.vehicle),
          plateNumber: booking.vehicle?.plateNumber ?? null,
          timeSlotId: booking.timeSlotId,
          timeSlotLabel: timeSlot?.label ?? 'Unassigned Slot',
          scheduledDate: booking.scheduledDate,
          status: booking.status,
        };
      });

    return {
      generatedAt: this.getCurrentDate().toISOString(),
      scheduledDate,
      currentCount: items.length,
      items,
    };
  }

  private async assertUserExists(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async assertVehicleOwnership(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesRepository.findOwnedByUser(vehicleId, userId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found for user');
    }

    return vehicle;
  }

  private async assertServicesExist(serviceIds: string[]) {
    const foundServices = await this.bookingsRepository.findServiceIds(serviceIds);
    if (foundServices.length !== serviceIds.length) {
      throw new NotFoundException('One or more requested services were not found');
    }
  }

  private async assertTimeSlotAvailability(timeSlotId: string, scheduledDate: string, excludeBookingId?: string) {
    this.assertBookingDateWithinWindow(scheduledDate);
    const timeSlot = await this.bookingsRepository.findTimeSlotById(timeSlotId);
    if (!timeSlot || !timeSlot.isActive) {
      throw new NotFoundException('Time slot not found');
    }

    const activeBookings = await this.bookingsRepository.countActiveBookingsForSlot(
      timeSlotId,
      scheduledDate,
      excludeBookingId,
    );

    if (activeBookings >= timeSlot.capacity) {
      throw new ConflictException('Selected time slot is already full');
    }
  }

  private assertTimeWindow(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('Time slot start time must be earlier than end time');
    }
  }

  private normalizeAvailabilityQuery(query: BookingAvailabilityQueryDto) {
    const startDate = parseDateOnly(query.startDate);
    const endDate = parseDateOnly(query.endDate);

    if (!startDate || !endDate) {
      throw new BadRequestException('Availability queries require valid startDate and endDate values');
    }

    if (startDate > endDate) {
      throw new BadRequestException('Availability startDate must be earlier than or equal to endDate');
    }

    const requestedWindowDays = getDateDiffInDays(startDate, endDate) + 1;
    if (requestedWindowDays > BOOKING_MAX_QUERY_WINDOW_DAYS) {
      throw new BadRequestException(
        `Availability queries cannot exceed ${BOOKING_MAX_QUERY_WINDOW_DAYS} days per request`,
      );
    }

    return {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
      timeSlotId: query.timeSlotId,
    };
  }

  private async listActiveAvailabilitySlots(timeSlotId?: string) {
    if (timeSlotId) {
      const timeSlot = await this.bookingsRepository.findTimeSlotById(timeSlotId);
      if (!timeSlot) {
        throw new NotFoundException('Time slot not found');
      }

      return timeSlot.isActive ? [timeSlot] : [];
    }

    const timeSlots = await this.bookingsRepository.listTimeSlots();
    return timeSlots.filter((timeSlot) => timeSlot.isActive);
  }

  private assertBookingDateWithinWindow(scheduledDate: string) {
    const parsedDate = parseDateOnly(scheduledDate);
    if (!parsedDate) {
      throw new BadRequestException('Scheduled date must use YYYY-MM-DD format');
    }

    const normalizedDate = formatDateOnly(parsedDate);
    const { minBookableDate, maxBookableDate } = this.getBookingWindowBounds();

    if (normalizedDate < minBookableDate || normalizedDate > maxBookableDate) {
      throw new ConflictException('Scheduled date is outside the supported booking window');
    }
  }

  private getBookingWindowBounds() {
    const today = toDateOnly(this.getCurrentDate());
    const minBookableDate = formatDateOnly(addDays(today, BOOKING_MIN_LEAD_DAYS));
    const maxBookableDate = formatDateOnly(addDays(today, BOOKING_MAX_HORIZON_DAYS));

    return {
      minBookableDate,
      maxBookableDate,
    };
  }

  private getCurrentDate() {
    return this.bookingsClock?.now() ?? new Date();
  }

  private toBookingView(booking: any) {
    return {
      ...booking,
      customerName: this.getCustomerDisplayName(booking?.user),
      customerEmail: booking?.user?.email ?? null,
      vehicleDisplayName: this.getVehicleDisplayName(booking?.vehicle),
      plateNumber: booking?.vehicle?.plateNumber ?? null,
    };
  }

  private getCustomerDisplayName(user: any) {
    const fullName = [user?.profile?.firstName, user?.profile?.lastName]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return fullName || (user?.email ?? null);
  }

  private getVehicleDisplayName(vehicle: any) {
    const label = [vehicle?.year, vehicle?.make, vehicle?.model]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ');

    return label || (vehicle?.plateNumber ?? null);
  }

  private async assertStaffActor(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('Booking operator not found');
    }

    if (!['service_adviser', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only service advisers or super admins can manage bookings');
    }

    return user;
  }
}
