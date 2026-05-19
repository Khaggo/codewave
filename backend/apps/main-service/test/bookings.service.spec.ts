import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { BOOKINGS_CLOCK } from '@main-modules/bookings/bookings.constants';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { BookingReservationPaymentGatewayService } from '@main-modules/bookings/services/booking-reservation-payment-gateway.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';

describe('BookingsService', () => {
  const fixedBookingClock = {
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  };

  const buildReservationPayment = (overrides: Record<string, any> = {}) => ({
    provider: 'paymongo',
    status: 'pending',
    amountCents: 50000,
    currencyCode: 'PHP',
    providerPaymentId: 'cs_123',
    providerCheckoutUrl: 'https://checkout.paymongo.test/cs_123',
    referenceNumber: null,
    failureReason: null,
    expiresAt: new Date('2026-04-01T00:30:00.000Z'),
    refundStatus: 'not_required',
    auditMetadata: null,
    ...overrides,
  });

  const buildBooking = (overrides: Record<string, any> = {}) => ({
    id: 'booking-1',
    userId: 'user-1',
    vehicleId: 'vehicle-1',
    timeSlotId: 'slot-1',
    scheduledDate: '2026-04-20',
    status: 'pending_payment',
    qrCodeToken: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
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
      endTime: '10:00',
      capacity: 2,
    },
    requestedServices: [],
    reservationPayment: buildReservationPayment(),
    statusHistory: [],
    ...overrides,
  });

  const buildGatewayMock = () => ({
    createReservationPayment: jest.fn().mockResolvedValue({
      provider: 'paymongo',
      status: 'pending',
      providerPaymentId: 'cs_123',
      checkoutUrl: 'https://checkout.paymongo.test/cs_123',
      referenceNumber: null,
      paidAt: null,
      failureReason: null,
    }),
    retrieveReservationPayment: jest.fn().mockResolvedValue({
      provider: 'paymongo',
      status: 'pending',
      providerPaymentId: 'cs_123',
      checkoutUrl: 'https://checkout.paymongo.test/cs_123',
      referenceNumber: null,
      paidAt: null,
      failureReason: null,
    }),
    parseReservationPaymentWebhook: jest.fn(),
  });

  const buildNotificationsMock = () => ({
    applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'booking.reminder_requested' }),
    enqueueNotification: jest.fn().mockResolvedValue(undefined),
  });

  const buildBookingsRepositoryMock = () => ({
    findDateClosureByScheduledDate: jest.fn().mockResolvedValue(null),
    findDateClosuresInRange: jest.fn().mockResolvedValue([]),
    findServiceIds: jest.fn().mockResolvedValue([{ id: 'service-1' }]),
    findTimeSlotById: jest.fn().mockResolvedValue({
      id: 'slot-1',
      isActive: true,
      capacity: 2,
      startTime: '09:00',
      endTime: '10:00',
    }),
    countActiveBookingsForSlot: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(buildBooking()),
    findById: jest.fn().mockResolvedValue(buildBooking()),
    findOptionalById: jest.fn().mockResolvedValue(null),
    findByReservationProviderPaymentId: jest.fn().mockResolvedValue(null),
    getOrCreatePaymentPolicy: jest.fn().mockResolvedValue({
      reservationFeeAmountCents: 50000,
      currencyCode: 'PHP',
      onlineExpiryWindowMinutes: 30,
    }),
    createOrReplaceReservationPayment: jest.fn().mockResolvedValue({ id: 'payment-1' }),
    updateStatus: jest.fn().mockResolvedValue(buildBooking({ status: 'confirmed' })),
    updateBookingQrCode: jest.fn().mockResolvedValue({}),
    listTimeSlots: jest.fn().mockResolvedValue([]),
    findByScheduledDate: jest.fn().mockResolvedValue([]),
    findByScheduledDateRange: jest.fn().mockResolvedValue([]),
    upsertDateClosure: jest.fn(),
    updateDateClosure: jest.fn(),
  });

  const buildUsersServiceMock = () => ({
    findById: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'jamie@example.com',
      role: 'customer',
      isActive: true,
      profile: {
        firstName: 'Jamie',
        lastName: 'Driver',
      },
    }),
  });

  const buildVehiclesRepositoryMock = () => ({
    findOwnedByUser: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'user-1' }),
  });

  const createModule = async ({
    bookingsRepository = buildBookingsRepositoryMock(),
    usersService = buildUsersServiceMock(),
    vehiclesRepository = buildVehiclesRepositoryMock(),
    paymentGateway = buildGatewayMock(),
    notificationsService = buildNotificationsMock(),
  }: Partial<{
    bookingsRepository: ReturnType<typeof buildBookingsRepositoryMock>;
    usersService: ReturnType<typeof buildUsersServiceMock>;
    vehiclesRepository: ReturnType<typeof buildVehiclesRepositoryMock>;
    paymentGateway: ReturnType<typeof buildGatewayMock>;
    notificationsService: ReturnType<typeof buildNotificationsMock>;
  }> = {}) => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BOOKINGS_CLOCK, useValue: fixedBookingClock },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: BookingReservationPaymentGatewayService, useValue: paymentGateway },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    return {
      service: moduleRef.get(BookingsService),
      bookingsRepository,
      usersService,
      vehiclesRepository,
      paymentGateway,
      notificationsService,
    };
  };

  it('creates a booking when user, vehicle, services, and slot are valid', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.create.mockResolvedValue(
      buildBooking({
        id: 'booking-1',
      }),
    );
    bookingsRepository.findById.mockResolvedValue(
      buildBooking({
        id: 'booking-1',
        reservationPayment: buildReservationPayment({
          providerPaymentId: 'cs_live_1',
        }),
      }),
    );

    const { service } = await createModule({ bookingsRepository });

    const result = await service.create({
      userId: 'user-1',
      vehicleId: 'vehicle-1',
      timeSlotId: 'slot-1',
      scheduledDate: '2026-04-20',
      serviceIds: ['service-1'],
      notes: 'Please check the brakes too.',
    }, { userId: 'user-1', role: 'customer' });

    expect(bookingsRepository.create).toHaveBeenCalled();
    expect(bookingsRepository.createOrReplaceReservationPayment).toHaveBeenCalled();
    expect(result.id).toBe('booking-1');
  });

  it('rejects booking creation when the vehicle is not owned by the user', async () => {
    const vehiclesRepository = {
      findOwnedByUser: jest.fn().mockResolvedValue(null),
    };

    const { service } = await createModule({ vehiclesRepository });

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-04-20',
        serviceIds: ['service-1'],
      }, { userId: 'user-1', role: 'customer' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects booking creation when a customer targets another user account', async () => {
    const { service } = await createModule();

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-04-20',
        serviceIds: ['service-1'],
      }, { userId: 'other-user', role: 'customer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects booking creation when the selected slot is already full', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findTimeSlotById.mockResolvedValue({ id: 'slot-1', isActive: true, capacity: 1 });
    bookingsRepository.countActiveBookingsForSlot.mockResolvedValue(1);

    const { service } = await createModule({ bookingsRepository });

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-04-20',
        serviceIds: ['service-1'],
      }, { userId: 'user-1', role: 'customer' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid booking status transitions', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findById.mockResolvedValue(
      buildBooking({
        status: 'completed',
        reservationPayment: null,
      }),
    );
    const usersService = buildUsersServiceMock();
    usersService.findById.mockResolvedValue({
      id: 'staff-1',
      role: 'service_adviser',
      isActive: true,
    });

    const { service } = await createModule({ bookingsRepository, usersService });

    await expect(
      service.updateStatus(
        'booking-1',
        {
          status: 'confirmed',
        },
        'staff-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('schedules a customer booking reminder when staff confirms a booking', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findById.mockResolvedValue(
      buildBooking({
        status: 'pending',
        reservationPayment: null,
      }),
    );
    bookingsRepository.updateStatus.mockResolvedValue(
      buildBooking({
        status: 'confirmed',
        reservationPayment: null,
      }),
    );
    const usersService = buildUsersServiceMock();
    usersService.findById.mockResolvedValue({
      id: 'staff-1',
      role: 'service_adviser',
      isActive: true,
    });
    const notificationsService = buildNotificationsMock();

    const { service } = await createModule({
      bookingsRepository,
      usersService,
      notificationsService,
    });

    await service.updateStatus(
      'booking-1',
      {
        status: 'confirmed',
      },
      'staff-1',
    );

    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'booking.reminder_requested',
        sourceDomain: 'main-service.bookings',
        payload: expect.objectContaining({
          bookingId: 'booking-1',
          userId: 'user-1',
          scheduledFor: '2026-04-19T09:00:00.000Z',
          appointmentStartsAt: '2026-04-20T09:00:00.000Z',
        }),
      }),
    );
  });

  it('builds a daily schedule and queue snapshot for adviser-led operations', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.listTimeSlots.mockResolvedValue([
      {
        id: 'slot-1',
        label: 'Morning Slot',
        capacity: 2,
      },
    ]);
    bookingsRepository.findByScheduledDate.mockResolvedValue([
      buildBooking({
        status: 'confirmed',
      }),
      buildBooking({
        id: 'booking-2',
        userId: 'user-2',
        vehicleId: 'vehicle-2',
        status: 'rescheduled',
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
      }),
    ]);

    const { service } = await createModule({ bookingsRepository });

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
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findById.mockResolvedValue(buildBooking({ reservationPayment: null }));
    const usersService = buildUsersServiceMock();
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      isActive: true,
    });

    const { service } = await createModule({ bookingsRepository, usersService });

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
    const { service } = await createModule();

    await expect(
      service.create({
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        timeSlotId: 'slot-1',
        scheduledDate: '2026-10-15',
        serviceIds: ['service-1'],
      }, { userId: 'user-1', role: 'customer' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds bounded booking availability from active slot definitions and booking counts', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.listTimeSlots.mockResolvedValue([
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
    ]);
    bookingsRepository.findByScheduledDateRange.mockResolvedValue([
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
        status: 'pending_payment',
      },
    ]);

    const { service } = await createModule({ bookingsRepository });

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

  it('marks closed dates as unavailable in booking availability reads', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.listTimeSlots.mockResolvedValue([
      {
        id: 'slot-1',
        label: 'Morning Slot',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 2,
        isActive: true,
      },
    ]);
    bookingsRepository.findDateClosuresInRange.mockResolvedValue([
      {
        id: 'closure-1',
        scheduledDate: '2026-04-02',
        label: 'Holiday closure',
        reason: 'Shop is closed for a holiday.',
        isClosed: true,
      },
    ]);

    const { service } = await createModule({ bookingsRepository });

    const availability = await service.getAvailability({
      startDate: '2026-04-02',
      endDate: '2026-04-02',
    });

    expect(availability.days).toEqual([
      expect.objectContaining({
        scheduledDate: '2026-04-02',
        status: 'closed',
        closureLabel: 'Holiday closure',
        closureReason: 'Shop is closed for a holiday.',
        isBookable: false,
        availableSlotCount: 0,
      }),
    ]);
  });

  it('rejects booking creation when the selected date is closed for bookings', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findDateClosureByScheduledDate.mockResolvedValue({
      id: 'closure-1',
      scheduledDate: '2026-04-20',
      label: 'Holiday closure',
      reason: 'Shop is closed for a holiday.',
      isClosed: true,
    });

    const { service } = await createModule({ bookingsRepository });

    await expect(
      service.create(
        {
          userId: 'user-1',
          vehicleId: 'vehicle-1',
          timeSlotId: 'slot-1',
          scheduledDate: '2026-04-20',
          serviceIds: ['service-1'],
          notes: '',
        },
        { userId: 'user-1', role: 'customer' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('auto-confirms a pending reservation payment when PayMongo reports a paid checkout session', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findById
      .mockResolvedValueOnce(
        buildBooking({
          status: 'pending_payment',
          reservationPayment: buildReservationPayment({
            providerPaymentId: 'cs_paid_1',
          }),
        }),
      )
      .mockResolvedValueOnce(
        buildBooking({
          status: 'confirmed',
          qrCodeToken: 'qr-123',
          reservationPayment: buildReservationPayment({
            status: 'paid',
            providerPaymentId: 'cs_paid_1',
            referenceNumber: 'PM-2026-1001',
            paidAt: new Date('2026-04-01T00:05:00.000Z'),
          }),
        }),
      );
    const paymentGateway = buildGatewayMock();
    paymentGateway.retrieveReservationPayment.mockResolvedValue({
      provider: 'paymongo',
      status: 'paid',
      providerPaymentId: 'cs_paid_1',
      checkoutUrl: 'https://checkout.paymongo.test/cs_paid_1',
      referenceNumber: 'PM-2026-1001',
      paidAt: new Date('2026-04-01T00:05:00.000Z'),
      failureReason: null,
    });

    const { service, notificationsService } = await createModule({
      bookingsRepository,
      paymentGateway,
    });

    const reservationPayment = await service.getReservationPayment('booking-1', {
      userId: 'user-1',
      role: 'customer',
    });

    expect(paymentGateway.retrieveReservationPayment).toHaveBeenCalledWith('cs_paid_1');
    expect(bookingsRepository.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'confirmed',
      }),
    );
    expect(bookingsRepository.updateBookingQrCode).toHaveBeenCalledWith('booking-1', expect.any(String));
    expect(notificationsService.applyTrigger).toHaveBeenCalled();
    expect(reservationPayment?.status).toBe('paid');
    expect(reservationPayment?.referenceNumber).toBe('PM-2026-1001');
  });

  it('expires a reservation payment when the local payment window has passed', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findById
      .mockResolvedValueOnce(
        buildBooking({
          reservationPayment: buildReservationPayment({
            providerPaymentId: 'cs_expired_1',
            expiresAt: new Date('2026-03-31T23:59:00.000Z'),
          }),
        }),
      )
      .mockResolvedValueOnce(
        buildBooking({
          status: 'cancelled',
          reservationPayment: buildReservationPayment({
            status: 'expired',
            providerPaymentId: 'cs_expired_1',
            failureReason: 'Reservation payment window expired before confirmation.',
            expiresAt: new Date('2026-03-31T23:59:00.000Z'),
          }),
        }),
      );
    const paymentGateway = buildGatewayMock();
    paymentGateway.retrieveReservationPayment.mockResolvedValue({
      provider: 'paymongo',
      status: 'pending',
      providerPaymentId: 'cs_expired_1',
      checkoutUrl: 'https://checkout.paymongo.test/cs_expired_1',
      referenceNumber: null,
      paidAt: null,
      failureReason: null,
    });

    const { service, bookingsRepository: repositoryMock } = await createModule({
      bookingsRepository,
      paymentGateway,
    });

    const reservationPayment = await service.getReservationPayment('booking-1', {
      userId: 'user-1',
      role: 'customer',
    });

    expect(paymentGateway.retrieveReservationPayment).toHaveBeenCalledWith('cs_expired_1');
    expect(repositoryMock.createOrReplaceReservationPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-1',
        status: 'expired',
      }),
    );
    expect(repositoryMock.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'cancelled',
      }),
    );
    expect(reservationPayment?.status).toBe('expired');
  });

  it('accepts a paid PayMongo webhook and confirms the matching booking', async () => {
    const bookingsRepository = buildBookingsRepositoryMock();
    bookingsRepository.findOptionalById.mockResolvedValue(
      buildBooking({
        reservationPayment: buildReservationPayment({
          providerPaymentId: 'cs_webhook_1',
        }),
      }),
    );
    bookingsRepository.findById.mockResolvedValue(
      buildBooking({
        status: 'confirmed',
        qrCodeToken: 'qr-456',
        reservationPayment: buildReservationPayment({
          status: 'paid',
          providerPaymentId: 'cs_webhook_1',
          referenceNumber: 'PM-2026-2002',
          paidAt: new Date('2026-04-01T00:06:00.000Z'),
        }),
      }),
    );
    const paymentGateway = buildGatewayMock();
    paymentGateway.parseReservationPaymentWebhook.mockReturnValue({
      eventType: 'checkout_session.payment.paid',
      livemode: false,
      providerPaymentId: 'cs_webhook_1',
      bookingId: 'booking-1',
      referenceNumber: 'PM-2026-2002',
      paidAt: new Date('2026-04-01T00:06:00.000Z'),
      status: 'paid',
      failureReason: null,
    });

    const { service } = await createModule({
      bookingsRepository,
      paymentGateway,
    });

    const result = await service.handlePaymongoWebhook(Buffer.from('{}'), 'test-signature');

    expect(paymentGateway.parseReservationPaymentWebhook).toHaveBeenCalledWith(
      expect.any(Buffer),
      'test-signature',
    );
    expect(bookingsRepository.createOrReplaceReservationPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-1',
        status: 'paid',
        referenceNumber: 'PM-2026-2002',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        received: true,
        ignored: false,
        bookingId: 'booking-1',
      }),
    );
  });
});
