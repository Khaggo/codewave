import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('VehicleLifecycleController integration', () => {
  it('returns a deterministic timeline with administrative and verified entries', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });
      const customer = await seedAuthUser({
        email: 'timeline-owner@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'History',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);
      expect(customerLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'LFC1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
        });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-04-28',
          serviceIds: [servicesResponse.body[0].id],
        });
      expect(bookingResponse.status).toBe(201);

      const confirmedBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-LIFE-001',
        });
      expect(confirmedBookingResponse.status).toBe(200);

      const inspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
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

      const timelineResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleResponse.body.id}/timeline`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
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
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'timeline-missing@example.com',
        password: 'password123',
        firstName: 'Mina',
        lastName: 'Missing',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const response = await request(app.getHttpServer())
        .get('/api/vehicles/missing-vehicle-id/timeline')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
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
          email: adviser.email,
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: customer.email,
          password: 'password123',
        }),
      ]);
      expect(adviserLogin.status).toBe(200);
      expect(customerLogin.status).toBe(200);

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'AI11501',
          make: 'Honda',
          model: 'City',
          year: 2024,
        });
      expect(vehicleResponse.status).toBe(201);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const bookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-05-12',
          serviceIds: [servicesResponse.body[0].id],
        });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-LIFE-002',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const inspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
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
          status: 'queued',
          customerVisible: false,
        }),
      );
      expect(generateResponse.body.provenance).toEqual(
        expect.objectContaining({
          provider: 'ai-worker-placeholder',
          model: 'queued-summary-generation',
          promptVersion: 'vehicle-lifecycle.summary.v1',
        }),
      );
      expect(generateResponse.body.generationJob).toEqual(
        expect.objectContaining({
          queueName: 'ai-worker-jobs',
          jobName: 'generate-vehicle-lifecycle-summary',
          status: 'queued',
        }),
      );

      const forbiddenReviewResponse = await request(app.getHttpServer())
        .patch(`/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/${generateResponse.body.id}/review`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          decision: 'approved',
          reviewNotes: 'Customer attempted self-approval.',
        });
      expect(forbiddenReviewResponse.status).toBe(403);

      const reviewResponse = await request(app.getHttpServer())
        .patch(`/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/${generateResponse.body.id}/review`)
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

  it('expands the lifecycle timeline with job-order, QA, and reviewed-summary events', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'timeline.integration.adviser@example.com',
        password: 'password123',
        firstName: 'Aria',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-2201',
      });
      const technician = await seedAuthUser({
        email: 'timeline.integration.tech@example.com',
        password: 'password123',
        firstName: 'Toni',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-2201',
      });
      const superAdmin = await seedAuthUser({
        email: 'timeline.integration.admin@example.com',
        password: 'password123',
        firstName: 'Mina',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'ADMIN-2201',
      });
      const customer = await seedAuthUser({
        email: 'timeline-expansion.customer@example.com',
        password: 'password123',
        firstName: 'Liam',
        lastName: 'Owner',
      });

      const [adviserLogin, technicianLogin, superAdminLogin, customerLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: adviser.email,
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: technician.email,
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: superAdmin.email,
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: customer.email,
          password: 'password123',
        }),
      ]);
      expect(adviserLogin.status).toBe(200);
      expect(technicianLogin.status).toBe(200);
      expect(superAdminLogin.status).toBe(200);
      expect(customerLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'TL3021',
          make: 'Toyota',
          model: 'Innova',
          year: 2024,
        });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-06-18',
          serviceIds: [servicesResponse.body[0].id],
          notes: 'Investigate steering vibration at highway speed.',
        });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-LIFE-003',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const createJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customer.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          notes: 'Track steering vibration complaint through release readiness.',
          items: [
            {
              name: 'Inspect steering and suspension vibration sources',
              description: 'Check balancing, tie rods, and steering rack mounts.',
            },
          ],
          assignedTechnicianIds: [technician.id],
        });
      expect(createJobOrderResponse.status).toBe(201);

      const inProgressResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'in_progress',
        });
      expect(inProgressResponse.status).toBe(200);

      const evidencePhotoResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/photos`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          fileName: 'timeline-expansion-work-item.jpg',
          fileUrl: 'https://files.example.com/job-orders/timeline-expansion-work-item.jpg',
          caption: 'Evidence linked before QA lifecycle expansion.',
          linkedEntityType: 'work_item',
          linkedEntityId: createJobOrderResponse.body.items[0].id,
        });
      expect(evidencePhotoResponse.status).toBe(200);

      const addProgressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Balancing and steering inspection completed.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(addProgressResponse.status).toBe(200);

      const readyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(readyForQaResponse.status).toBe(200);

      const qaResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}/qa`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(qaResponse.status).toBe(200);
      expect(qaResponse.body.status).toBe('pending_review');

      const qaVerdictResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/verdict`)
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          verdict: 'passed',
          note: 'Approved after reviewing the QA-cleared lifecycle evidence.',
        });
      expect(qaVerdictResponse.status).toBe(200);
      expect(qaVerdictResponse.body.status).toBe('passed');

      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Invoice-ready after QA cleared the steering vibration work.',
        });
      expect(finalizeResponse.status).toBe(200);

      const generateSummaryResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/generate`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({});
      expect(generateSummaryResponse.status).toBe(201);

      const reviewSummaryResponse = await request(app.getHttpServer())
        .patch(`/api/vehicles/${vehicleResponse.body.id}/lifecycle-summary/${generateSummaryResponse.body.id}/review`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          decision: 'approved',
          reviewNotes: 'Approved after confirming the QA-cleared release path.',
        });
      expect(reviewSummaryResponse.status).toBe(200);

      const timelineResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleResponse.body.id}/timeline`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(timelineResponse.status).toBe(200);
      expect(timelineResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'job_order_created',
            sourceType: 'job_order',
            sourceId: createJobOrderResponse.body.id,
          }),
          expect.objectContaining({
            eventType: 'job_order_finalized',
            sourceType: 'job_order',
            sourceId: createJobOrderResponse.body.id,
          }),
          expect.objectContaining({
            eventType: 'quality_gate_passed',
            sourceType: 'quality_gate',
          }),
          expect.objectContaining({
            eventType: 'lifecycle_summary_approved',
            sourceType: 'lifecycle_summary',
            sourceId: generateSummaryResponse.body.id,
            actorUserId: adviser.id,
          }),
        ]),
      );

      const dedupeKeys = timelineResponse.body.map((entry: { dedupeKey: string }) => entry.dedupeKey);
      expect(new Set(dedupeKeys).size).toBe(dedupeKeys.length);
    } finally {
      await app.close();
    }
  });
});
