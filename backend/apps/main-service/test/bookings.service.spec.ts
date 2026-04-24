import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { BOOKINGS_CLOCK } from '@main-modules/bookings/bookings.constants';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { BookingsService } from '@main-modules/bookings/services/bookings.service';

describe('BookingsService', () => {
  const fixedBookingClock = {
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  };

  it('creates a booking when user, vehicle, services, and slot are valid', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const vehiclesRepository = {
      findOwnedByUser: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'user-1' }),
    };

    const bookingsRepository = {
      findServiceIds: jest.fn().mockResolvedValue([{ id: 'service-1' }]),
      findTimeSlotById: jest.fn().mockResolvedValue({ id: 'slot-1', isActive: true, capacity: 2 }),
      countActiveBookingsForSlot: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({
        id: 'booking-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        status: 'pending',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    const result = await service.create({
      userId: 'user-1',
      vehicleId: 'vehicle-1',
      timeSlotId: 'slot-1',
      scheduledDate: '2026-04-20',
      serviceIds: ['service-1'],
      notes: 'Please check the brakes too.',
    });

    expect(usersService.findById).toHaveBeenCalledWith('user-1');
    expect(vehiclesRepository.findOwnedByUser).toHaveBeenCalledWith('vehicle-1', 'user-1');
    expect(bookingsRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('booking-1');
  });

  it('rejects booking creation when the vehicle is not owned by the user', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        {
          provide: BookingsRepository,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'user-1' }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-04-20',
        serviceIds: ['service-1'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects booking creation when the selected slot is already full', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        {
          provide: BookingsRepository,
          useValue: {
            findServiceIds: jest.fn().mockResolvedValue([{ id: 'service-1' }]),
            findTimeSlotById: jest.fn().mockResolvedValue({ id: 'slot-1', isActive: true, capacity: 1 }),
            countActiveBookingsForSlot: jest.fn().mockResolvedValue(1),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'user-1' }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'user-1' }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-04-20',
        serviceIds: ['service-1'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid booking status transitions', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        {
          provide: BookingsRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              status: 'completed',
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'staff-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    await expect(
      service.updateStatus('booking-1', {
        status: 'confirmed',
      }, 'staff-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds a daily schedule and queue snapshot for adviser-led operations', async () => {
    const bookingsRepository = {
      listTimeSlots: jest.fn().mockResolvedValue([
        {
          id: 'slot-1',
          label: 'Morning Slot',
          capacity: 2,
        },
      ]),
      findByScheduledDate: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          userId: 'user-1',
          vehicleId: 'vehicle-1',
          timeSlotId: 'slot-1',
          scheduledDate: '2026-04-20',
          status: 'confirmed',
          createdAt: new Date('2026-04-20T08:00:00.000Z'),
          user: {
            email: 'jamie@example.com',
            profile: {
              firstName: 'Jamie',
              lastName: 'Driver',
            },
          },
          vehicle: {
            plateNumber: 'BKG1234',
            make: 'Toyota',
            model: 'Vios',
            year: 2022,
          },
          timeSlot: {
            id: 'slot-1',
            label: 'Morning Slot',
            startTime: '09:00',
          },
        },
        {
          id: 'booking-2',
          userId: 'user-2',
          vehicleId: 'vehicle-2',
          timeSlotId: 'slot-1',
          scheduledDate: '2026-04-20',
          status: 'rescheduled',
          createdAt: new Date('2026-04-20T08:15:00.000Z'),
          user: {
            email: 'alex@example.com',
            profile: {
              firstName: 'Alex',
              lastName: 'Queue',
            },
          },
          vehicle: {
            plateNumber: 'QEU5678',
            make: 'Honda',
            model: 'City',
            year: 2021,
          },
          timeSlot: {
            id: 'slot-1',
            label: 'Morning Slot',
            startTime: '09:00',
          },
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    const schedule = await service.getDailySchedule({
      scheduledDate: '2026-04-20',
    });
    expect(schedule.slots[0]).toEqual(
      expect.objectContaining({
        timeSlotId: 'slot-1',
        confirmedCount: 1,
        rescheduledCount: 1,
        bookings: expect.arrayContaining([
          expect.objectContaining({
            customerName: 'Jamie Driver',
            vehicleDisplayName: '2022 Toyota Vios',
          }),
        ]),
      }),
    );

    const queue = await service.getQueueCurrent({
      scheduledDate: '2026-04-20',
    });
    expect(queue.currentCount).toBe(2);
    expect(queue.items[0]).toEqual(
      expect.objectContaining({
        queuePosition: 1,
        bookingId: 'booking-1',
        customerName: 'Jamie Driver',
        vehicleDisplayName: '2022 Toyota Vios',
      }),
    );
  });

  it('rejects booking operations from non-adviser actors', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        {
          provide: BookingsRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'user-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    await expect(
      service.updateStatus(
        'booking-1',
        {
          status: 'confirmed',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects booking creation outside the supported booking window', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        {
          provide: BookingsRepository,
          useValue: {
            findServiceIds: jest.fn().mockResolvedValue([{ id: 'service-1' }]),
            findTimeSlotById: jest.fn().mockResolvedValue({ id: 'slot-1', isActive: true, capacity: 2 }),
            countActiveBookingsForSlot: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'user-1' }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'user-1' }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-10-15',
        serviceIds: ['service-1'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds bounded booking availability from active slot definitions and booking counts', async () => {
    const bookingsRepository = {
      listTimeSlots: jest.fn().mockResolvedValue([
        {
          id: 'slot-1',
          label: 'Morning Slot',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 2,
          isActive: true,
        },
        {
          id: 'slot-2',
          label: 'Afternoon Slot',
          startTime: '14:00',
          endTime: '15:00',
          capacity: 1,
          isActive: true,
        },
      ]),
      findByScheduledDateRange: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          timeSlotId: 'slot-1',
          scheduledDate: '2026-04-02',
          status: 'confirmed',
        },
        {
          id: 'booking-2',
          timeSlotId: 'slot-1',
          scheduledDate: '2026-04-02',
          status: 'pending',
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(BookingsService);

    const availability = await service.getAvailability({
      startDate: '2026-04-01',
      endDate: '2026-04-03',
    });

    expect(availability.minBookableDate).toBe('2026-04-02');
    expect(availability.maxBookableDate).toBe('2026-09-28');
    expect(availability.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scheduledDate: '2026-04-01',
          status: 'outside_window',
          isBookable: false,
        }),
        expect.objectContaining({
          scheduledDate: '2026-04-02',
          status: 'limited',
          isBookable: true,
          availableSlotCount: 1,
        }),
        expect.objectContaining({
          scheduledDate: '2026-04-03',
          status: 'bookable',
          isBookable: true,
          availableSlotCount: 2,
        }),
      ]),
    );
  });
});
