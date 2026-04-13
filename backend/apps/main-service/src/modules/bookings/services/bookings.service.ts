import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';

import { CreateBookingDto } from '../dto/create-booking.dto';
import { DailyScheduleQueryDto } from '../dto/daily-schedule-query.dto';
import { QueueCurrentQueryDto } from '../dto/queue-current-query.dto';
import { RescheduleBookingDto } from '../dto/reschedule-booking.dto';
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

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly usersService: UsersService,
    private readonly vehiclesRepository: VehiclesRepository,
  ) {}

  async listServices() {
    return this.bookingsRepository.listServices();
  }

  async listTimeSlots() {
    return this.bookingsRepository.listTimeSlots();
  }

  async create(createBookingDto: CreateBookingDto) {
    await this.assertUserExists(createBookingDto.userId);
    await this.assertVehicleOwnership(createBookingDto.userId, createBookingDto.vehicleId);
    await this.assertServicesExist(createBookingDto.serviceIds);
    await this.assertTimeSlotAvailability(createBookingDto.timeSlotId, createBookingDto.scheduledDate);

    return this.bookingsRepository.create(createBookingDto);
  }

  async findById(id: string) {
    return this.bookingsRepository.findById(id);
  }

  async findByUserId(userId: string) {
    await this.assertUserExists(userId);
    return this.bookingsRepository.findByUserId(userId);
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

    return this.bookingsRepository.updateStatus(id, command);
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

    return this.bookingsRepository.reschedule(id, command);
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
          bookings: slotBookings,
        };
      }),
    };
  }

  async getQueueCurrent(query: QueueCurrentQueryDto) {
    const scheduledDate = query.scheduledDate ?? new Date().toISOString().slice(0, 10);
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
          timeSlotId: booking.timeSlotId,
          timeSlotLabel: timeSlot?.label ?? 'Unassigned Slot',
          scheduledDate: booking.scheduledDate,
          status: booking.status,
        };
      });

    return {
      generatedAt: new Date().toISOString(),
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
