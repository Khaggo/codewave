import request from 'supertest';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('JobOrdersController integration', () => {
  it('creates, reads, and updates a job order across adviser and technician roles', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();
    const eventBus = app.get(AutocareEventBusService);

    try {
      eventBus.clearPublishedEvents();

      const adviser = await seedAuthUser({
        email: 'adviser.joborders@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });

      const technician = await seedAuthUser({
        email: 'technician.joborders@example.com',
        password: 'password123',
        firstName: 'Theo',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-2001',
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
        email: 'joborder.customer@example.com',
        firstName: 'Jamie',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'JOB106',
        make: 'Toyota',
        model: 'Fortuner',
        year: 2023,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-05',
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
          notes: 'Customer reported rattling during morning startup.',
          items: [
            {
              name: 'Inspect engine bay and mounting points',
            },
          ],
          assignedTechnicianIds: [technician.id],
        });

      expect(createJobOrderResponse.status).toBe(201);
      expect(createJobOrderResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          status: 'assigned',
        }),
      );
      expect(createJobOrderResponse.body.assignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            technicianUserId: technician.id,
          }),
        ]),
      );

      const readAsAdviserResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(readAsAdviserResponse.status).toBe(200);

      const updateStatusResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'in_progress',
          reason: 'Technician started diagnostics.',
        });
      expect(updateStatusResponse.status).toBe(200);
      expect(updateStatusResponse.body.status).toBe('in_progress');

      const readyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(readyForQaResponse.status).toBe(200);
      expect(readyForQaResponse.body.status).toBe('ready_for_qa');

      const addProgressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Initial diagnostics and mounting inspection completed.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(addProgressResponse.status).toBe(200);
      expect(addProgressResponse.body.progressEntries[0]).toEqual(
        expect.objectContaining({
          technicianUserId: technician.id,
          entryType: 'work_completed',
        }),
      );
      expect(addProgressResponse.body.items[0].isCompleted).toBe(true);

      const addPhotoResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/photos`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          fileName: 'diagnostics-overview.jpg',
          fileUrl: 'https://files.example.com/job-orders/diagnostics-overview.jpg',
          caption: 'Overview photo before QA handoff.',
        });
      expect(addPhotoResponse.status).toBe(200);
      expect(addPhotoResponse.body.photos[0]).toEqual(
        expect.objectContaining({
          takenByUserId: adviser.id,
          fileName: 'diagnostics-overview.jpg',
        }),
      );

      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Ready for invoice generation after successful QA prep.',
        });
      expect(finalizeResponse.status).toBe(200);
      expect(finalizeResponse.body.status).toBe('finalized');
      expect(finalizeResponse.body.invoiceRecord).toEqual(
        expect.objectContaining({
          jobOrderId: createJobOrderResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          finalizedByUserId: adviser.id,
        }),
      );
      expect(eventBus.listPublishedEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'service.invoice_finalized',
            sourceDomain: 'main-service.job-orders',
            payload: expect.objectContaining({
              jobOrderId: createJobOrderResponse.body.id,
              invoiceRecordId: finalizeResponse.body.invoiceRecord.id,
              invoiceReference: finalizeResponse.body.invoiceRecord.invoiceReference,
              customerUserId: customerResponse.body.id,
              vehicleId: vehicleResponse.body.id,
              serviceAdviserUserId: adviser.id,
            }),
          }),
        ]),
      );

      const recordPaymentResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/invoice/payments`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          amountPaidCents: 159900,
          paymentMethod: 'cash',
          reference: 'OR-2026-0001',
          receivedAt: '2026-05-14T10:30:00.000Z',
        });
      expect(recordPaymentResponse.status).toBe(200);
      expect(recordPaymentResponse.body.invoiceRecord).toEqual(
        expect.objectContaining({
          paymentStatus: 'paid',
          amountPaidCents: 159900,
          paymentMethod: 'cash',
          paymentReference: 'OR-2026-0001',
          recordedByUserId: adviser.id,
        }),
      );
      expect(eventBus.listPublishedEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'service.payment_recorded',
            sourceDomain: 'main-service.job-orders',
            payload: expect.objectContaining({
              jobOrderId: createJobOrderResponse.body.id,
              invoiceRecordId: finalizeResponse.body.invoiceRecord.id,
              invoiceReference: finalizeResponse.body.invoiceRecord.invoiceReference,
              customerUserId: customerResponse.body.id,
              amountPaidCents: 159900,
              settlementStatus: 'paid',
              paymentMethod: 'cash',
            }),
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('derives confirmed booking handoffs from daily schedule and lists technician assigned job orders', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.handoffs@example.com',
        password: 'password123',
        firstName: 'Hana',
        lastName: 'Handoff',
        role: 'service_adviser',
        staffCode: 'SA-HANDOFF',
      });
      const technician = await seedAuthUser({
        email: 'technician.handoffs@example.com',
        password: 'password123',
        firstName: 'Tia',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-HANDOFF',
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
        email: 'handoff.customer@example.com',
        firstName: 'Cora',
        lastName: 'Confirmed',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'HND123',
        make: 'Honda',
        model: 'City',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-07',
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

      const scheduleResponse = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule?scheduledDate=2026-05-07&status=confirmed')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(scheduleResponse.status).toBe(200);
      expect(scheduleResponse.body).toEqual(
        expect.objectContaining({
          scheduledDate: '2026-05-07',
          slots: expect.any(Array),
        }),
      );
      const scheduleBookings = scheduleResponse.body.slots.flatMap((slot: { bookings?: Array<{ id: string }> }) =>
        Array.isArray(slot.bookings) ? slot.bookings : [],
      );
      expect(scheduleBookings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: bookingResponse.body.id,
            status: 'confirmed',
          }),
        ]),
      );

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
          items: [{ name: 'Prepare confirmed handoff work' }],
          assignedTechnicianIds: [technician.id],
        });
      expect(createJobOrderResponse.status).toBe(201);

      const assignedJobOrdersResponse = await request(app.getHttpServer())
        .get('/api/job-orders/assigned')
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`);
      expect(assignedJobOrdersResponse.status).toBe(200);
      expect(assignedJobOrdersResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createJobOrderResponse.body.id,
            sourceId: bookingResponse.body.id,
          }),
        ]),
      );

      const adviserAssignedResponse = await request(app.getHttpServer())
        .get('/api/job-orders/assigned')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(adviserAssignedResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('lets advisers replace persisted assignments while rejecting technician reassignment and operational clears', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.reassign@example.com',
        password: 'password123',
        firstName: 'Rina',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-REASSIGN',
      });
      const technicianA = await seedAuthUser({
        email: 'technician.reassign.a@example.com',
        password: 'password123',
        firstName: 'Tess',
        lastName: 'Tech A',
        role: 'technician',
        staffCode: 'TECH-REASSIGN-A',
      });
      const technicianB = await seedAuthUser({
        email: 'technician.reassign.b@example.com',
        password: 'password123',
        firstName: 'Trent',
        lastName: 'Tech B',
        role: 'technician',
        staffCode: 'TECH-REASSIGN-B',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);

      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: technicianA.email,
        password: 'password123',
      });
      expect(technicianLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'joborder.reassign.customer@example.com',
        firstName: 'Robin',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'JOB207',
        make: 'Honda',
        model: 'Civic',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-08',
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

      const createDraftResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          notes: 'Create as draft for later reassignment.',
          items: [
            {
              name: 'Inspect engine mounts',
            },
          ],
          assignedTechnicianIds: [],
        });
      expect(createDraftResponse.status).toBe(201);
      expect(createDraftResponse.body.status).toBe('draft');
      expect(createDraftResponse.body.assignments).toEqual([]);

      const replaceAssignmentsResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createDraftResponse.body.id}/assignments`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          assignedTechnicianIds: [technicianB.id],
        });
      expect(replaceAssignmentsResponse.status).toBe(200);
      expect(replaceAssignmentsResponse.body.status).toBe('assigned');
      expect(replaceAssignmentsResponse.body.assignments).toEqual([
        expect.objectContaining({
          technicianUserId: technicianB.id,
        }),
      ]);

      const technicianForbiddenResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createDraftResponse.body.id}/assignments`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          assignedTechnicianIds: [technicianA.id],
        });
      expect(technicianForbiddenResponse.status).toBe(403);

      const clearAssignmentsResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createDraftResponse.body.id}/assignments`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          assignedTechnicianIds: [],
        });
      expect(clearAssignmentsResponse.status).toBe(409);
    } finally {
      await app.close();
    }
  });

  it('rejects unauthorized access and duplicate booking job orders', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.dup@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-3001',
      });

      const otherTechnician = await seedAuthUser({
        email: 'technician.other@example.com',
        password: 'password123',
        firstName: 'Terry',
        lastName: 'Tech',
        role: 'technician',
        staffCode: 'TECH-3002',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: otherTechnician.email,
        password: 'password123',
      });

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerUser = await seedAuthUser({
        email: 'joborder.auth.customer@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Customer',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customerUser.email,
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerUser.id,
        plateNumber: 'JOBDUP',
        make: 'Honda',
        model: 'Civic',
        year: 2022,
      });

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerUser.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-05-06',
        serviceIds: [servicesResponse.body[0].id],
      });

      await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
        });

      const createJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerUser.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          items: [{ name: 'Inspect suspension components' }],
        });
      expect(createJobOrderResponse.status).toBe(201);

      const duplicateJobOrderResponse = await request(app.getHttpServer())
        .post('/api/job-orders')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          customerUserId: customerUser.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode,
          items: [{ name: 'Inspect suspension components' }],
        });
      expect(duplicateJobOrderResponse.status).toBe(409);

      const customerReadAttempt = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerReadAttempt.status).toBe(403);

      const unassignedTechnicianReadAttempt = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`);
      expect(unassignedTechnicianReadAttempt.status).toBe(403);

      const unassignedTechnicianProgressAttempt = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'note',
          message: 'Attempted unauthorized progress entry.',
        });
      expect(unassignedTechnicianProgressAttempt.status).toBe(403);

      const customerPhotoAttempt = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/photos`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          fileName: 'customer-upload.jpg',
          fileUrl: 'https://files.example.com/customer-upload.jpg',
        });
      expect(customerPhotoAttempt.status).toBe(403);

      const finalizeBeforeReadyResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Attempted invoice generation too early.',
        });
      expect(finalizeBeforeReadyResponse.status).toBe(409);
    } finally {
      await app.close();
    }
  });
});
