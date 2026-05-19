import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('BookingsController integration', () => {
  it('lists booking metadata, creates a booking, lets staff manage the schedule, and lists user bookings', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'adviser@example.com',
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);

      const bookingOwner = await seedAuthUser({
        email: 'booking-owner@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Driver',
      });
      const ownerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'booking-owner@example.com',
        password: 'password123',
      });
      expect(ownerLogin.status).toBe(200);
      const ownerAuthHeader = { Authorization: `Bearer ${ownerLogin.body.accessToken}` };

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      expect(servicesResponse.status).toBe(200);
      expect(servicesResponse.body.length).toBeGreaterThan(0);

      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');
      expect(timeSlotsResponse.status).toBe(200);
      expect(timeSlotsResponse.body.length).toBeGreaterThan(0);

      const createTimeSlotResponse = await request(app.getHttpServer())
        .post('/api/time-slots')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          label: 'Late Afternoon Slot',
          startTime: '16:00',
          endTime: '17:00',
          capacity: 3,
        });
      expect(createTimeSlotResponse.status).toBe(201);
      expect(createTimeSlotResponse.body).toEqual(
        expect.objectContaining({
          label: 'Late Afternoon Slot',
          capacity: 3,
          isActive: true,
        }),
      );

      const updateTimeSlotResponse = await request(app.getHttpServer())
        .patch(`/api/time-slots/${createTimeSlotResponse.body.id}`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          capacity: 4,
          isActive: false,
        });
      expect(updateTimeSlotResponse.status).toBe(200);
      expect(updateTimeSlotResponse.body).toEqual(
        expect.objectContaining({
          id: createTimeSlotResponse.body.id,
          capacity: 4,
          isActive: false,
        }),
      );

      const archiveTimeSlotResponse = await request(app.getHttpServer())
        .delete(`/api/time-slots/${createTimeSlotResponse.body.id}`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(archiveTimeSlotResponse.status).toBe(200);
      expect(archiveTimeSlotResponse.body).toEqual(
        expect.objectContaining({
          id: createTimeSlotResponse.body.id,
          isActive: false,
        }),
      );

      const timeSlotsAfterArchive = await request(app.getHttpServer()).get('/api/time-slots');
      expect(timeSlotsAfterArchive.status).toBe(200);
      expect(timeSlotsAfterArchive.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createTimeSlotResponse.body.id,
          }),
        ]),
      );

      const availabilityResponse = await request(app.getHttpServer())
        .get('/api/bookings/availability')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .query({
          startDate: '2026-04-01',
          endDate: '2026-04-03',
        });
      expect(availabilityResponse.status).toBe(200);
      expect(availabilityResponse.body).toEqual(
        expect.objectContaining({
          minBookableDate: '2026-04-02',
          maxBookableDate: '2026-09-28',
        }),
      );
      expect(availabilityResponse.body.days).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scheduledDate: '2026-04-01',
            status: 'outside_window',
          }),
          expect.objectContaining({
            scheduledDate: '2026-04-02',
            isBookable: true,
          }),
        ]),
      );

      const createClosureResponse = await request(app.getHttpServer())
        .post('/api/admin/booking-date-closures')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          scheduledDate: '2026-04-22',
          label: 'Holiday closure',
          reason: 'Shop is closed for a holiday.',
        });
      expect(createClosureResponse.status).toBe(201);
      expect(createClosureResponse.body).toEqual(
        expect.objectContaining({
          scheduledDate: '2026-04-22',
          isClosed: true,
          label: 'Holiday closure',
        }),
      );

      const closedAvailabilityResponse = await request(app.getHttpServer())
        .get('/api/bookings/availability')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .query({
          startDate: '2026-04-22',
          endDate: '2026-04-22',
        });
      expect(closedAvailabilityResponse.status).toBe(200);
      expect(closedAvailabilityResponse.body.days).toEqual([
        expect.objectContaining({
          scheduledDate: '2026-04-22',
          status: 'closed',
          isBookable: false,
          closureLabel: 'Holiday closure',
        }),
      ]);

      const closedDailyScheduleResponse = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .query({
          scheduledDate: '2026-04-22',
        });
      expect(closedDailyScheduleResponse.status).toBe(200);
      expect(closedDailyScheduleResponse.body).toEqual(
        expect.objectContaining({
          scheduledDate: '2026-04-22',
          isClosed: true,
          closureLabel: 'Holiday closure',
        }),
      );

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set(ownerAuthHeader)
        .send({
          userId: bookingOwner.id,
          plateNumber: 'BKG1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2022,
        });

      const createBookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set(ownerAuthHeader)
        .send({
          userId: bookingOwner.id,
          vehicleId: vehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-04-20',
          serviceIds: [servicesResponse.body[0].id],
          notes: 'Please inspect the brakes.',
        });

      expect(createBookingResponse.status).toBe(201);
      expect(createBookingResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          userId: bookingOwner.id,
          vehicleId: vehicleResponse.body.id,
          status: 'pending_payment',
          customerName: 'Jamie Driver',
          vehicleDisplayName: '2022 Toyota Vios',
        }),
      );
      expect(createBookingResponse.body.reservationPayment).toEqual(
        expect.objectContaining({
          status: 'pending',
        }),
      );

      const readBookingResponse = await request(app.getHttpServer())
        .get(`/api/bookings/${createBookingResponse.body.id}`)
        .set(ownerAuthHeader);
      expect(readBookingResponse.status).toBe(200);
      expect(readBookingResponse.body.timeSlot.id).toBe(timeSlotsResponse.body[0].id);
      expect(readBookingResponse.body.status).toBe('pending_payment');

      const confirmReservationPaymentResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${createBookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-2026-0001',
        });
      expect(confirmReservationPaymentResponse.status).toBe(200);
      expect(confirmReservationPaymentResponse.body.status).toBe('confirmed');
      expect(confirmReservationPaymentResponse.body.statusHistory[0].changedByUserId).toBeTruthy();

      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/api/bookings/${createBookingResponse.body.id}/reschedule`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          timeSlotId: timeSlotsResponse.body[1].id,
          scheduledDate: '2026-04-21',
          reason: 'Customer requested a later slot.',
        });
      expect(rescheduleResponse.status).toBe(200);
      expect(rescheduleResponse.body.status).toBe('rescheduled');
      expect(rescheduleResponse.body.timeSlotId).toBe(timeSlotsResponse.body[1].id);
      expect(rescheduleResponse.body.scheduledDate).toBe('2026-04-21');

      const dailyScheduleResponse = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .query({
          scheduledDate: '2026-04-21',
        });
      expect(dailyScheduleResponse.status).toBe(200);
      expect(dailyScheduleResponse.body.slots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            timeSlotId: timeSlotsResponse.body[1].id,
            bookings: expect.arrayContaining([
              expect.objectContaining({
                id: createBookingResponse.body.id,
                status: 'rescheduled',
                customerName: 'Jamie Driver',
                vehicleDisplayName: '2022 Toyota Vios',
              }),
            ]),
          }),
        ]),
      );

      const queueResponse = await request(app.getHttpServer())
        .get('/api/queue/current')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .query({
          scheduledDate: '2026-04-21',
        });
      expect(queueResponse.status).toBe(200);
      expect(queueResponse.body.currentCount).toBe(1);
      expect(queueResponse.body.items[0]).toEqual(
        expect.objectContaining({
          bookingId: createBookingResponse.body.id,
          queuePosition: 1,
          customerName: 'Jamie Driver',
          vehicleDisplayName: '2022 Toyota Vios',
        }),
      );

      const userBookingsResponse = await request(app.getHttpServer())
        .get(`/api/users/${bookingOwner.id}/bookings`)
        .set(ownerAuthHeader);
      expect(userBookingsResponse.status).toBe(200);
      expect(userBookingsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createBookingResponse.body.id,
            status: 'rescheduled',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects invalid ownership, full slots, invalid status transitions, and unauthorized staff operations', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });
      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'adviser@example.com',
        password: 'password123',
      });

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const ownerResponse = await seedAuthUser({
        email: 'owner@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Owner',
      });
      const otherUserResponse = await seedAuthUser({
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Robin',
        lastName: 'Other',
      });
      const ownerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'owner@example.com',
        password: 'password123',
      });
      const otherUserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'other@example.com',
        password: 'password123',
      });
      const ownerAuthHeader = { Authorization: `Bearer ${ownerLogin.body.accessToken}` };
      const otherAuthHeader = { Authorization: `Bearer ${otherUserLogin.body.accessToken}` };

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').set(ownerAuthHeader).send({
        userId: ownerResponse.id,
        plateNumber: 'OWN5678',
        make: 'Honda',
        model: 'City',
        year: 2021,
      });

      const invalidOwnership = await request(app.getHttpServer()).post('/api/bookings').set(otherAuthHeader).send({
        userId: otherUserResponse.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(invalidOwnership.status).toBe(404);

      const firstBooking = await request(app.getHttpServer()).post('/api/bookings').set(ownerAuthHeader).send({
        userId: ownerResponse.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[1].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(firstBooking.status).toBe(201);

      const fullSlotAttempt = await request(app.getHttpServer()).post('/api/bookings').set(ownerAuthHeader).send({
        userId: ownerResponse.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[1].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(fullSlotAttempt.status).toBe(409);

      const outsideWindowAttempt = await request(app.getHttpServer()).post('/api/bookings').set(ownerAuthHeader).send({
        userId: ownerResponse.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-10-15',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(outsideWindowAttempt.status).toBe(409);

      const directStatusConfirmAttempt = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(directStatusConfirmAttempt.status).toBe(409);

      const confirmReservationPayment = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-2026-0002',
        });
      expect(confirmReservationPayment.status).toBe(200);
      expect(confirmReservationPayment.body.status).toBe('confirmed');

      const directCompletionAttempt = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'completed',
        });
      expect(directCompletionAttempt.status).toBe(409);

      const workshopHandoff = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'in_service',
        });
      expect(workshopHandoff.status).toBe(200);

      const invalidTransition = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(invalidTransition.status).toBe(409);

      await seedAuthUser({
        email: 'customer.auth@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Customer',
      });

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'customer.auth@example.com',
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const forbiddenStatusUpdate = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          status: 'declined',
        });
      expect(forbiddenStatusUpdate.status).toBe(403);

      const forbiddenTimeSlotCreate = await request(app.getHttpServer())
        .post('/api/time-slots')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          label: 'Customer Slot',
          startTime: '11:00',
          endTime: '12:00',
          capacity: 2,
        });
      expect(forbiddenTimeSlotCreate.status).toBe(403);

      const missingBearerSchedule = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule')
        .query({
          scheduledDate: '2026-04-22',
        });
      expect(missingBearerSchedule.status).toBe(401);

      const missingBearerAvailability = await request(app.getHttpServer())
        .get('/api/bookings/availability')
        .query({
          startDate: '2026-04-01',
          endDate: '2026-04-03',
        });
      expect(missingBearerAvailability.status).toBe(401);
    } finally {
      await app.close();
    }
  });
});
