import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('VehicleLifecycleController integration', () => {
  it('returns a deterministic timeline with administrative and verified entries', async () => {
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
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'timeline-owner@example.com',
        firstName: 'Jamie',
        lastName: 'History',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'LFC1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2023,
      });

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: userResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-28',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(bookingResponse.status).toBe(201);

      const confirmedBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
          reason: 'Staff confirmed the appointment.',
        });
      expect(confirmedBookingResponse.status).toBe(200);

      const inspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'completion',
          status: 'completed',
          notes: 'Vehicle passed completion verification.',
          findings: [
            {
              category: 'release',
              label: 'Completion check passed',
              severity: 'info',
              isVerified: true,
            },
          ],
        });
      expect(inspectionResponse.status).toBe(201);

      const timelineResponse = await request(app.getHttpServer()).get(
        `/api/vehicles/${vehicleResponse.body.id}/timeline`,
      );
      expect(timelineResponse.status).toBe(200);

      expect(timelineResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'booking_created',
            eventCategory: 'administrative',
            verified: false,
            sourceType: 'booking',
          }),
          expect.objectContaining({
            eventType: 'booking_confirmed',
            eventCategory: 'administrative',
            verified: false,
            sourceType: 'booking',
          }),
          expect.objectContaining({
            eventType: 'inspection_completion_completed',
            eventCategory: 'verified',
            verified: true,
            sourceType: 'inspection',
            inspectionId: inspectionResponse.body.id,
          }),
        ]),
      );

      const occurredAtValues = timelineResponse.body.map((entry: { occurredAt: string; dedupeKey: string }) => ({
        occurredAt: entry.occurredAt,
        dedupeKey: entry.dedupeKey,
      }));
      const sortedValues = [...occurredAtValues].sort((left, right) => {
        const occurredAtDiff = new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
        if (occurredAtDiff !== 0) {
          return occurredAtDiff;
        }

        return left.dedupeKey.localeCompare(right.dedupeKey);
      });
      expect(occurredAtValues).toEqual(sortedValues);
    } finally {
      await app.close();
    }
  });

  it('returns 404 for a missing vehicle timeline', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const response = await request(app.getHttpServer()).get('/api/vehicles/missing-vehicle-id/timeline');
      expect(response.status).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('generates and reviews lifecycle summaries while keeping customer visibility gated', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'lifecycle.adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Reviewer',
        role: 'service_adviser',
        staffCode: 'SA-1401',
      });
      const customer = await seedAuthUser({
        email: 'lifecycle.customer@example.com',
        password: 'password123',
        firstName: 'Lena',
        lastName: 'Driver',
      });

      const [adviserLogin, customerLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'lifecycle.adviser@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'lifecycle.customer@example.com',
          password: 'password123',
        }),
      ]);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customer.id,
        plateNumber: 'AI11501',
        make: 'Honda',
        model: 'City',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customer.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-12',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(bookingResponse.status).toBe(201);

      const inspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'completion',
          status: 'completed',
          notes: 'Final lifecycle evidence recorded.',
          findings: [
            {
              category: 'release',
              label: 'Completion verification passed',
              severity: 'info',
              isVerified: true,
            },
          ],
        });
      expect(inspectionResponse.status).toBe(201);

      const generateResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/generate`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({});
      expect(generateResponse.status).toBe(201);
      expect(generateResponse.body).toEqual(
        expect.objectContaining({
          vehicleId: vehicleResponse.body.id,
          requestedByUserId: adviser.id,
          status: 'pending_review',
          customerVisible: false,
        }),
      );
      expect(generateResponse.body.provenance).toEqual(
        expect.objectContaining({
          provider: 'local-summary-adapter',
          model: 'timeline-summary-v1',
          promptVersion: 'vehicle-lifecycle.summary.v1',
        }),
      );

      const forbiddenReviewResponse = await request(app.getHttpServer())
        .patch(
          `/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/${generateResponse.body.id}/review`,
        )
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          decision: 'approved',
          reviewNotes: 'Customer attempted self-approval.',
        });
      expect(forbiddenReviewResponse.status).toBe(403);

      const reviewResponse = await request(app.getHttpServer())
        .patch(
          `/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/${generateResponse.body.id}/review`,
        )
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          decision: 'approved',
          reviewNotes: 'Approved after checking the latest verified lifecycle evidence.',
        });
      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body).toEqual(
        expect.objectContaining({
          id: generateResponse.body.id,
          status: 'approved',
          customerVisible: true,
          reviewedByUserId: adviser.id,
          reviewNotes: 'Approved after checking the latest verified lifecycle evidence.',
        }),
      );
      expect(reviewResponse.body.reviewedAt).toEqual(expect.any(String));
      expect(reviewResponse.body.customerVisibleAt).toEqual(expect.any(String));
    } finally {
      await app.close();
    }
  });
});
