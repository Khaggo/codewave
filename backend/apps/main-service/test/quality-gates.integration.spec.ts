import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('QualityGatesController integration', () => {
  it('blocks release when QA finds incomplete work and clears after the job order re-enters QA with completed evidence', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.quality@example.com',
        password: 'password123',
        firstName: 'Avery',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-4001',
      });

      const technician = await seedAuthUser({
        email: 'technician.quality@example.com',
        password: 'password123',
        firstName: 'Toni',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-4001',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);

      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: technician.email,
        password: 'password123',
      });
      expect(technicianLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'quality.customer@example.com',
        firstName: 'Jamie',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'QAGATE1',
        make: 'Toyota',
        model: 'Vios',
        year: 2022,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-06-10',
        serviceIds: [servicesResponse.body[0].id],
        notes: 'Engine rattling noise during cold start.',
      });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const createJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          notes: 'Track the engine rattle complaint through QA.',
          items: [{ name: 'Resolve engine rattling noise', description: 'Inspect drive belt and cold-start pulleys.' }],
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

      const readyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(readyForQaResponse.status).toBe(200);

      const firstQaResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}/qa`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(firstQaResponse.status).toBe(200);
      expect(firstQaResponse.body.status).toBe('blocked');
      expect(firstQaResponse.body.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'incomplete_work_items',
          }),
        ]),
      );

      const blockedFinalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Attempted release while QA was still blocked.',
        });
      expect(blockedFinalizeResponse.status).toBe(409);

      const returnToProgressResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'in_progress',
        });
      expect(returnToProgressResponse.status).toBe(200);

      const addProgressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Drive belt inspection complete and ready for QA review.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(addProgressResponse.status).toBe(200);

      const secondReadyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(secondReadyForQaResponse.status).toBe(200);

      const secondQaResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}/qa`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(secondQaResponse.status).toBe(200);
      expect(secondQaResponse.body.status).toBe('passed');
      expect(secondQaResponse.body.blockingReason).toBeNull();
      expect(secondQaResponse.body.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gate: 'gate_1',
            code: 'semantic_resolution_supported',
            provenance: expect.objectContaining({
              provider: 'local-rule-auditor',
              recommendation: 'supported',
              matchedKeywords: expect.arrayContaining(['engine', 'rattl', 'cold']),
            }),
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('blocks release when a verified high-severity completion finding is not reflected in the job-order evidence', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.gate2@example.com',
        password: 'password123',
        firstName: 'Quinn',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-4010',
      });

      const technician = await seedAuthUser({
        email: 'technician.gate2@example.com',
        password: 'password123',
        firstName: 'River',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-4010',
      });

      const superAdmin = await seedAuthUser({
        email: 'superadmin.gate2@example.com',
        password: 'password123',
        firstName: 'Morgan',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'ADMIN-4010',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);

      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: technician.email,
        password: 'password123',
      });
      expect(technicianLogin.status).toBe(200);

      const superAdminLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: superAdmin.email,
        password: 'password123',
      });
      expect(superAdminLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'gate2.customer@example.com',
        firstName: 'Jordan',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'QAGATE2',
        make: 'Honda',
        model: 'Civic',
        year: 2021,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-06-11',
        serviceIds: [servicesResponse.body[0].id],
        notes: 'Engine rattling noise during cold start.',
      });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const createJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          notes: 'Resolve the engine rattle concern before release.',
          items: [
            {
              name: 'Inspect engine rattle',
              description: 'Inspect drive belt and cold-start pulleys.',
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

      const addProgressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Engine rattle inspection completed and ready for QA.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(addProgressResponse.status).toBe(200);

      const completionInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'completion',
          status: 'completed',
          notes: 'Final release inspection.',
          findings: [
            {
              category: 'brakes',
              label: 'Brake fluid leak at front line',
              severity: 'high',
              notes: 'Leak remains visible on final inspection.',
              isVerified: true,
            },
          ],
        });
      expect(completionInspectionResponse.status).toBe(201);

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
      expect(qaResponse.body.status).toBe('blocked');
      expect(qaResponse.body.riskScore).toBe(75);
      expect(qaResponse.body.blockingReason).toContain('Brake fluid leak at front line');
      expect(qaResponse.body.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gate: 'gate_2',
            code: 'verified_high_severity_unresolved',
            provenance: expect.objectContaining({
              provider: 'local-rule-engine',
              ruleId: 'gate_2.verified_high_severity_unresolved',
              evidenceRefs: expect.arrayContaining([
                `inspection:${completionInspectionResponse.body.id}`,
              ]),
              riskContribution: 75,
            }),
          }),
        ]),
      );

      const blockedFinalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Attempted release while unresolved completion inspection findings existed.',
        });
      expect(blockedFinalizeResponse.status).toBe(409);

      const forbiddenOverrideResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/override`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          reason: 'Service adviser is trying to override blocked QA.',
        });
      expect(forbiddenOverrideResponse.status).toBe(403);

      const overrideResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/override`)
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          reason: 'Supervisor approved release after reviewing the unresolved completion inspection.',
        });
      expect(overrideResponse.status).toBe(200);
      expect(overrideResponse.body.status).toBe('overridden');
      expect(overrideResponse.body.overrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            actorUserId: superAdmin.id,
            actorRole: 'super_admin',
            reason: 'Supervisor approved release after reviewing the unresolved completion inspection.',
          }),
        ]),
      );

      const overriddenQaResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}/qa`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(overriddenQaResponse.status).toBe(200);
      expect(overriddenQaResponse.body.status).toBe('overridden');
      expect(overriddenQaResponse.body.overrides[0].actorRole).toBe('super_admin');

      const finalizedAfterOverrideResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Invoice-ready record generated after a documented QA override.',
        });
      expect(finalizedAfterOverrideResponse.status).toBe(200);
      expect(finalizedAfterOverrideResponse.body.invoiceRecord).toEqual(
        expect.objectContaining({
          summary: 'Invoice-ready record generated after a documented QA override.',
        }),
      );
    } finally {
      await app.close();
    }
  });
});
