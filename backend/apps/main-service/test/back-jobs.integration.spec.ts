import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('BackJobsController integration', () => {
  it('creates, reviews, and links a back-job case into a rework job order', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.backjobs@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-4001',
      });

      const technician = await seedAuthUser({
        email: 'technician.backjobs@example.com',
        password: 'password123',
        firstName: 'Theo',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-4002',
      });

      const customer = await seedAuthUser({
        email: 'customer.backjobs@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: technician.email,
        password: 'password123',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      });

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customer.id,
        plateNumber: 'BJ109A',
        make: 'Toyota',
        model: 'Hilux',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customer.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-12',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const originalJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customer.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          items: [{ name: 'Inspect gasket seal' }],
          assignedTechnicianIds: [technician.id],
        });
      expect(originalJobOrderResponse.status).toBe(201);

      const inProgressResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${originalJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'in_progress',
        });
      expect(inProgressResponse.status).toBe(200);

      const progressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${originalJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Initial repair completed.',
          completedItemIds: [originalJobOrderResponse.body.items[0].id],
        });
      expect(progressResponse.status).toBe(200);

      const readyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${originalJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(readyForQaResponse.status).toBe(200);

      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${originalJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Original service completed before return review.',
        });
      expect(finalizeResponse.status).toBe(200);

      const returnInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          inspectionType: 'return',
          status: 'completed',
          findings: [
            {
              category: 'engine',
              label: 'Leak still present after original repair',
              severity: 'high',
              isVerified: true,
            },
          ],
          notes: 'Return visit confirms the original issue persisted.',
        });
      expect(returnInspectionResponse.status).toBe(201);

      const createBackJobResponse = await request(app.getHttpServer())
        .post('/api/back-jobs')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          customerUserId: customer.id,
          vehicleId: vehicleResponse.body.id,
          originalBookingId: bookingResponse.body.id,
          originalJobOrderId: originalJobOrderResponse.body.id,
          returnInspectionId: returnInspectionResponse.body.id,
          complaint: 'Customer returned because the leak remained after the previous service.',
          findings: [
            {
              category: 'engine',
              label: 'Leak persists around the original repair area',
              severity: 'high',
              isValidated: true,
            },
          ],
        });
      expect(createBackJobResponse.status).toBe(201);
      expect(createBackJobResponse.body.status).toBe('reported');

      const inspectedResponse = await request(app.getHttpServer())
        .patch(`/api/back-jobs/${createBackJobResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'inspected',
          reviewNotes: 'Return inspection confirms unresolved prior work.',
        });
      expect(inspectedResponse.status).toBe(200);
      expect(inspectedResponse.body.status).toBe('inspected');

      const approvedResponse = await request(app.getHttpServer())
        .patch(`/api/back-jobs/${createBackJobResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'approved_for_rework',
          reviewNotes: 'Approved for warranty rework.',
        });
      expect(approvedResponse.status).toBe(200);
      expect(approvedResponse.body.status).toBe('approved_for_rework');

      const reworkJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'back_job',
          sourceId: createBackJobResponse.body.id,
          customerUserId: customer.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          notes: 'Warranty rework issued from validated back-job review.',
          items: [{ name: 'Rework gasket seal and confirm leak resolution' }],
          assignedTechnicianIds: [technician.id],
        });
      expect(reworkJobOrderResponse.status).toBe(201);
      expect(reworkJobOrderResponse.body).toEqual(
        expect.objectContaining({
          sourceType: 'back_job',
          sourceId: createBackJobResponse.body.id,
          jobType: 'back_job',
          parentJobOrderId: originalJobOrderResponse.body.id,
        }),
      );

      const customerReadBackJobResponse = await request(app.getHttpServer())
        .get(`/api/back-jobs/${createBackJobResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerReadBackJobResponse.status).toBe(200);
      expect(customerReadBackJobResponse.body).toEqual(
        expect.objectContaining({
          id: createBackJobResponse.body.id,
          reworkJobOrderId: reworkJobOrderResponse.body.id,
          status: 'in_progress',
        }),
      );

      const vehicleBackJobsResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleResponse.body.id}/back-jobs`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(vehicleBackJobsResponse.status).toBe(200);
      expect(vehicleBackJobsResponse.body[0]).toEqual(
        expect.objectContaining({
          id: createBackJobResponse.body.id,
          reworkJobOrderId: reworkJobOrderResponse.body.id,
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects invalid back-job lineage and unauthorized customer visibility', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.backjobs.conflict@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-4010',
      });

      const customerOne = await seedAuthUser({
        email: 'customer.one.backjobs@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const customerTwo = await seedAuthUser({
        email: 'customer.two.backjobs@example.com',
        password: 'password123',
        firstName: 'Robin',
        lastName: 'Customer',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const customerTwoLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customerTwo.email,
        password: 'password123',
      });

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const vehicleOneResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerOne.id,
        plateNumber: 'BJ109B',
        make: 'Honda',
        model: 'City',
        year: 2023,
      });
      const vehicleTwoResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerTwo.id,
        plateNumber: 'BJ109C',
        make: 'Mitsubishi',
        model: 'Montero',
        year: 2022,
      });

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerOne.id,
        vehicleId: vehicleOneResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-13',
        serviceIds: [servicesResponse.body[0].id],
      });

      await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });

      const originalJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerOne.id,
          vehicleId: vehicleOneResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          items: [{ name: 'Diagnose repeat concern' }],
        });

      const invalidBackJobResponse = await request(app.getHttpServer())
        .post('/api/back-jobs')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          customerUserId: customerTwo.id,
          vehicleId: vehicleTwoResponse.body.id,
          originalJobOrderId: originalJobOrderResponse.body.id,
          complaint: 'Attempt to link the wrong service history.',
        });
      expect(invalidBackJobResponse.status).toBe(409);

      const foreignVehicleHistoryResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleOneResponse.body.id}/back-jobs`)
        .set('Authorization', `Bearer ${customerTwoLogin.body.accessToken}`);
      expect(foreignVehicleHistoryResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });
});
