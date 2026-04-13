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

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      expect(servicesResponse.status).toBe(200);
      expect(servicesResponse.body.length).toBeGreaterThan(0);

      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');
      expect(timeSlotsResponse.status).toBe(200);
      expect(timeSlotsResponse.body.length).toBeGreaterThan(0);

      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'booking-owner@example.com',
        firstName: 'Jamie',
        lastName: 'Driver',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'BKG1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2022,
      });

      const createBookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: userResponse.body.id,
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
          userId: userResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          status: 'pending',
        }),
      );

      const readBookingResponse = await request(app.getHttpServer()).get(
        `/api/bookings/${createBookingResponse.body.id}`,
      );
      expect(readBookingResponse.status).toBe(200);
      expect(readBookingResponse.body.timeSlot.id).toBe(timeSlotsResponse.body[0].id);

      const updateStatusResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${createBookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
          reason: 'Staff approved the slot.',
        });
      expect(updateStatusResponse.status).toBe(200);
      expect(updateStatusResponse.body.status).toBe('confirmed');
      expect(updateStatusResponse.body.statusHistory[0].changedByUserId).toBeTruthy();

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
        }),
      );

      const userBookingsResponse = await request(app.getHttpServer()).get(
        `/api/users/${userResponse.body.id}/bookings`,
      );
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

      const ownerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'owner@example.com',
        firstName: 'Casey',
        lastName: 'Owner',
      });
      const otherUserResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'other@example.com',
        firstName: 'Robin',
        lastName: 'Other',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: ownerResponse.body.id,
        plateNumber: 'OWN5678',
        make: 'Honda',
        model: 'City',
        year: 2021,
      });

      const invalidOwnership = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: otherUserResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(invalidOwnership.status).toBe(404);

      const firstBooking = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: ownerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[1].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(firstBooking.status).toBe(201);

      const fullSlotAttempt = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: ownerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[1].id,
        scheduledDate: '2026-04-22',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(fullSlotAttempt.status).toBe(409);

      await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });

      await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'completed',
        });

      const invalidTransition = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(invalidTransition.status).toBe(409);

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer.auth@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Customer',
      });
      expect(customerLogin.status).toBe(201);

      const forbiddenStatusUpdate = await request(app.getHttpServer())
        .patch(`/api/bookings/${firstBooking.body.id}/status`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          status: 'declined',
        });
      expect(forbiddenStatusUpdate.status).toBe(403);

      const missingBearerSchedule = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule')
        .query({
          scheduledDate: '2026-04-22',
        });
      expect(missingBearerSchedule.status).toBe(401);
    } finally {
      await app.close();
    }
  });
});
