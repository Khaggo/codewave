import request from 'supertest';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
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
    const eventBus = app.get(AutocareEventBusService);

    try {
      eventBus.clearPublishedEvents();

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
      expect(eventBus.listPublishedEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'quality_gate.overridden',
            sourceDomain: 'main-service.quality-gates',
            payload: expect.objectContaining({
              jobOrderId: createJobOrderResponse.body.id,
              actorUserId: superAdmin.id,
              reason: 'Supervisor approved release after reviewing the unresolved completion inspection.',
            }),
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

  it('keeps QA overrides one-way and still enforces finalize ownership after override', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const ownerAdviser = await seedAuthUser({
        email: 'adviser.owner.override@example.com',
        password: 'password123',
        firstName: 'Olivia',
        lastName: 'Owner',
        role: 'service_adviser',
        staffCode: 'SA-4020',
      });

      const otherAdviser = await seedAuthUser({
        email: 'adviser.other.override@example.com',
        password: 'password123',
        firstName: 'Aiden',
        lastName: 'Other',
        role: 'service_adviser',
        staffCode: 'SA-4021',
      });

      const technician = await seedAuthUser({
        email: 'technician.override@example.com',
        password: 'password123',
        firstName: 'Taylor',
        lastName: 'Tech',
        role: 'technician',
        staffCode: 'TECH-4020',
      });

      const superAdmin = await seedAuthUser({
        email: 'superadmin.override@example.com',
        password: 'password123',
        firstName: 'Morgan',
        lastName: 'Override',
        role: 'super_admin',
        staffCode: 'ADMIN-4020',
      });

      const ownerAdviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: ownerAdviser.email,
        password: 'password123',
      });
      expect(ownerAdviserLogin.status).toBe(200);

      const otherAdviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: otherAdviser.email,
        password: 'password123',
      });
      expect(otherAdviserLogin.status).toBe(200);

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
        email: 'override.owner.customer@example.com',
        firstName: 'Jordan',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'QAOWN1',
        make: 'Toyota',
        model: 'Hilux',
        year: 2023,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-06-12',
        serviceIds: [servicesResponse.body[0].id],
        notes: 'Engine vibration remains noticeable during cold start.',
      });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${ownerAdviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const createJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${ownerAdviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: ownerAdviser.id,
          serviceAdviserCode: ownerAdviser.staffCode,
          notes: 'Track engine vibration concern through QA override ownership checks.',
          items: [
            {
              name: 'Inspect and resolve engine vibration concern',
              description: 'Confirm the cold-start vibration complaint has been addressed.',
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
          message: 'Engine vibration inspection completed and queued for QA release check.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(addProgressResponse.status).toBe(200);

      const completionInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'completion',
          status: 'completed',
          notes: 'Final release inspection identified a remaining brake line leak.',
          findings: [
            {
              category: 'brakes',
              label: 'Brake line leak still visible',
              severity: 'high',
              notes: 'Release should remain blocked until manual review.',
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
        .set('Authorization', `Bearer ${ownerAdviserLogin.body.accessToken}`);
      expect(qaResponse.status).toBe(200);
      expect(qaResponse.body.status).toBe('blocked');
      expect(qaResponse.body.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            gate: 'gate_2',
            code: 'verified_high_severity_unresolved',
            provenance: expect.objectContaining({
              evidenceRefs: expect.arrayContaining([`inspection:${completionInspectionResponse.body.id}`]),
            }),
          }),
        ]),
      );

      const overrideResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/override`)
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          reason: 'Super admin approved a one-time release exception after documented review.',
        });
      expect(overrideResponse.status).toBe(200);
      expect(overrideResponse.body.status).toBe('overridden');

      const secondOverrideResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/override`)
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          reason: 'Attempting to override the same QA gate twice should fail closed.',
        });
      expect(secondOverrideResponse.status).toBe(409);

      const foreignAdviserFinalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${otherAdviserLogin.body.accessToken}`)
        .send({
          summary: 'A different adviser should not be able to finalize this overridden job order.',
        });
      expect(foreignAdviserFinalizeResponse.status).toBe(403);

      const ownerFinalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${ownerAdviserLogin.body.accessToken}`)
        .send({
          summary: 'Responsible adviser finalized after the documented QA override.',
        });
      expect(ownerFinalizeResponse.status).toBe(200);
      expect(ownerFinalizeResponse.body.invoiceRecord).toEqual(
        expect.objectContaining({
          finalizedByUserId: ownerAdviser.id,
          serviceAdviserUserId: ownerAdviser.id,
          summary: 'Responsible adviser finalized after the documented QA override.',
        }),
      );
    } finally {
      await app.close();
    }
  });
});
