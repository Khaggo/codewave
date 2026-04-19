import request from 'supertest';

import { createServiceEvent } from '@shared/events/contracts/service-events';

import { BackJobsService } from '../src/modules/back-jobs/services/back-jobs.service';
import { InsuranceService } from '../src/modules/insurance/services/insurance.service';
import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';
import { NotificationsService } from '../src/modules/notifications/services/notifications.service';
import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('AnalyticsController integration', () => {
  it('serves dashboard, operations, back-job, loyalty, and invoice-aging snapshots from derived analytics models', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'analytics.adviser@example.com',
        password: 'password123',
        firstName: 'Avery',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-7001',
      });

      const technician = await seedAuthUser({
        email: 'analytics.tech@example.com',
        password: 'password123',
        firstName: 'Tina',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-7001',
      });

      const superAdmin = await seedAuthUser({
        email: 'analytics.admin@example.com',
        password: 'password123',
        firstName: 'Mina',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'ADMIN-7001',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(adviserLogin.status).toBe(200);

      const technicianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'analytics.tech@example.com',
        password: 'password123',
      });
      expect(technicianLogin.status).toBe(200);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'analytics.customer@example.com',
        firstName: 'Casey',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'ANL113',
        make: 'Toyota',
        model: 'Vios',
        year: 2023,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-07-14',
        serviceIds: [servicesResponse.body[0].id],
        notes: 'Engine rattle and oil-change follow-up.',
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
          notes: 'Resolve engine rattle before vehicle release.',
          items: [
            {
              name: 'Resolve engine rattle',
              description: 'Inspect belts and pulleys, then complete the oil service.',
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

      const progressResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Engine rattle resolved and oil service completed.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });
      expect(progressResponse.status).toBe(200);

      const readyForQaResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });
      expect(readyForQaResponse.status).toBe(200);

      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Invoice-ready record after successful QA pass.',
        });
      expect(finalizeResponse.status).toBe(200);

      const insuranceService = app.get(InsuranceService);
      const insuranceInquiry = await insuranceService.create(
        {
          userId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Windshield crack follow-up',
          description: 'Customer asked for comprehensive coverage requirements.',
        },
        {
          userId: adviser.id,
          role: 'service_adviser',
        },
      );
      await insuranceService.updateStatus(
        insuranceInquiry.id,
        {
          status: 'needs_documents',
          reviewNotes: 'Waiting for additional photo evidence.',
        },
        {
          userId: adviser.id,
          role: 'service_adviser',
        },
      );

      const backJobsService = app.get(BackJobsService);
      await backJobsService.create(
        {
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          originalBookingId: bookingResponse.body.id,
          originalJobOrderId: createJobOrderResponse.body.id,
          complaint: 'Customer reports a faint rattle returned after two days.',
          findings: [
            {
              category: 'noise',
              label: 'Recurring front pulley vibration',
              severity: 'high',
              isValidated: true,
            },
          ],
        },
        {
          userId: adviser.id,
          role: 'service_adviser',
        },
      );

      const loyaltyService = app.get(LoyaltyService);
      await loyaltyService.createEarningRule(
        {
          name: 'Analytics paid service rule',
          accrualSource: 'service',
          formulaType: 'amount_ratio',
          amountStepCents: 5000,
          pointsPerStep: 1,
          minimumAmountCents: 5000,
          status: 'active',
        },
        {
          userId: superAdmin.id,
          role: 'super_admin',
        },
      );
      await loyaltyService.applyLoyaltyAccrual(
        createServiceEvent('service.payment_recorded', {
          jobOrderId: createJobOrderResponse.body.id,
          invoiceRecordId: finalizeResponse.body.invoiceRecord.id,
          invoiceReference: finalizeResponse.body.invoiceRecord.invoiceReference,
          customerUserId: customerResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          serviceAdviserUserId: adviser.id,
          serviceAdviserCode: adviser.staffCode!,
          recordedByUserId: adviser.id,
          sourceType: 'booking',
          sourceId: bookingResponse.body.id,
          amountPaidCents: 250000,
          currencyCode: 'PHP',
          paidAt: '2026-05-14T09:30:00.000Z',
          settlementStatus: 'paid',
          paymentMethod: 'cash',
        }),
      );

      const reward = await loyaltyService.createReward(
        {
          name: 'Free car wash',
          rewardType: 'service_voucher',
          pointsCost: 50,
          status: 'active',
        },
        {
          userId: superAdmin.id,
          role: 'super_admin',
        },
      );
      await loyaltyService.redeemReward(
        {
          userId: customerResponse.body.id,
          rewardId: reward.id,
          note: 'Analytics redemption seed.',
        },
        {
          userId: adviser.id,
          role: 'service_adviser',
        },
      );

      const notificationsService = app.get(NotificationsService);
      await notificationsService.scheduleReminder({
        userId: customerResponse.body.id,
        reminderType: 'invoice_aging',
        channel: 'email',
        sourceType: 'invoice_payment',
        sourceId: 'invoice-aging-1',
        scheduledFor: new Date('2026-07-01T09:00:00.000Z'),
        title: 'Invoice reminder',
        message: 'Invoice is now overdue.',
        dedupeKey: 'analytics:invoice-aging-1',
      });

      const [dashboardResponse, operationsResponse, backJobsResponse, loyaltyResponse, invoiceAgingResponse] =
        await Promise.all([
          request(app.getHttpServer())
            .get('/api/analytics/dashboard')
            .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`),
          request(app.getHttpServer())
            .get('/api/analytics/operations')
            .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`),
          request(app.getHttpServer())
            .get('/api/analytics/back-jobs')
            .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`),
          request(app.getHttpServer())
            .get('/api/analytics/loyalty')
            .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`),
          request(app.getHttpServer())
            .get('/api/analytics/invoice-aging')
            .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`),
        ]);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body).toEqual(
        expect.objectContaining({
          totals: expect.objectContaining({
            totalBookings: 1,
            finalizedServiceInvoices: 1,
            insuranceOpenInquiries: 1,
            openBackJobs: 1,
          }),
          serviceDemandPreview: expect.arrayContaining([
            expect.objectContaining({
              serviceName: servicesResponse.body[0].name,
            }),
          ]),
        }),
      );

      expect(operationsResponse.status).toBe(200);
      expect(operationsResponse.body.serviceAdviserLoad).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            serviceAdviserUserId: adviser.id,
            serviceAdviserCode: adviser.staffCode,
          }),
        ]),
      );

      expect(backJobsResponse.status).toBe(200);
      expect(backJobsResponse.body.repeatSources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            originalJobOrderId: createJobOrderResponse.body.id,
          }),
        ]),
      );

      expect(loyaltyResponse.status).toBe(200);
      expect(loyaltyResponse.body).toEqual(
        expect.objectContaining({
          totals: expect.objectContaining({
            redemptionCount: 1,
          }),
          topRewards: expect.arrayContaining([
            expect.objectContaining({
              rewardId: reward.id,
            }),
          ]),
        }),
      );

      expect(invoiceAgingResponse.status).toBe(200);
      expect(invoiceAgingResponse.body).toEqual(
        expect.objectContaining({
          totals: expect.objectContaining({
            trackedInvoices: 1,
            scheduledReminderRules: 1,
          }),
          trackedInvoicePolicies: expect.arrayContaining([
            expect.objectContaining({
              invoiceId: 'invoice-aging-1',
            }),
          ]),
        }),
      );

      const technicianForbiddenResponse = await request(app.getHttpServer())
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`);
      expect(technicianForbiddenResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('serves an audit-trail snapshot for staff admin actions, QA overrides, and release decisions', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'audittrail.adviser@example.com',
        password: 'password123',
        firstName: 'Avery',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-7101',
      });

      const technician = await seedAuthUser({
        email: 'audittrail.tech@example.com',
        password: 'password123',
        firstName: 'Toni',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-7101',
      });

      const superAdmin = await seedAuthUser({
        email: 'audittrail.admin@example.com',
        password: 'password123',
        firstName: 'Mina',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'ADMIN-7101',
      });

      const [adviserLogin, technicianLogin, superAdminLogin] = await Promise.all([
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
      ]);
      expect(adviserLogin.status).toBe(200);
      expect(technicianLogin.status).toBe(200);
      expect(superAdminLogin.status).toBe(200);

      const createStaffResponse = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          email: 'pending.audit.staff@example.com',
          password: 'SecurePass123',
          firstName: 'Paula',
          lastName: 'Pending',
          role: 'service_adviser',
          staffCode: 'SA-7110',
        });
      expect(createStaffResponse.status).toBe(201);

      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const customerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'audittrail.customer@example.com',
        firstName: 'Casey',
        lastName: 'Customer',
      });
      expect(customerResponse.status).toBe(201);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerResponse.body.id,
        plateNumber: 'AUD408',
        make: 'Toyota',
        model: 'Hilux',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customerResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-07-15',
        serviceIds: [servicesResponse.body[0].id],
        notes: 'Brake line leak concern before customer release.',
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
          notes: 'Track startup vibration concern through QA override observability.',
          items: [
            {
              name: 'Inspect startup vibration concern',
              description: 'Confirm the startup vibration has been resolved before release.',
            },
          ],
          assignedTechnicianIds: [technician.id],
        });
      expect(createJobOrderResponse.status).toBe(201);

      await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'in_progress',
        });

      await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/progress`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          entryType: 'work_completed',
          message: 'Startup vibration check completed and sent to QA.',
          completedItemIds: [createJobOrderResponse.body.items[0].id],
        });

      const completionInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'completion',
          status: 'completed',
          notes: 'Final release inspection still sees brake line leak evidence.',
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

      await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/status`)
        .set('Authorization', `Bearer ${technicianLogin.body.accessToken}`)
        .send({
          status: 'ready_for_qa',
        });

      const qaResponse = await request(app.getHttpServer())
        .get(`/api/job-orders/${createJobOrderResponse.body.id}/qa`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(qaResponse.status).toBe(200);
      expect(qaResponse.body.status).toBe('blocked');

      const overrideResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${createJobOrderResponse.body.id}/qa/override`)
        .set('Authorization', `Bearer ${superAdminLogin.body.accessToken}`)
        .send({
          reason: 'Supervisor approved release after documenting the brake-line exception.',
        });
      expect(overrideResponse.status).toBe(200);

      const finalizeResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${createJobOrderResponse.body.id}/finalize`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          summary: 'Invoice-ready release after documented QA override.',
        });
      expect(finalizeResponse.status).toBe(200);

      const auditTrailResponse = await request(app.getHttpServer())
        .get('/api/analytics/audit-trail')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);

      expect(auditTrailResponse.status).toBe(200);
      expect(auditTrailResponse.body).toEqual(
        expect.objectContaining({
          totals: expect.objectContaining({
            totalSensitiveActions: 3,
            staffAdminActions: 1,
            qualityGateOverrides: 1,
            releaseDecisions: 1,
          }),
          entries: expect.arrayContaining([
            expect.objectContaining({
              auditType: 'staff_admin_action',
              action: 'staff_account_provisioned',
              sourceDomain: 'main-service.auth',
              targetEntityId: createStaffResponse.body.id,
            }),
            expect.objectContaining({
              auditType: 'quality_gate_override',
              action: 'quality_gate_overridden',
              sourceDomain: 'main-service.quality-gates',
              targetEntityId: overrideResponse.body.id,
              reason: 'Supervisor approved release after documenting the brake-line exception.',
            }),
            expect.objectContaining({
              auditType: 'release_decision',
              action: 'service_invoice_finalized',
              sourceDomain: 'main-service.job-orders',
              targetEntityId: createJobOrderResponse.body.id,
              reason: 'Invoice-ready release after documented QA override.',
            }),
          ]),
        }),
      );
    } finally {
      await app.close();
    }
  });
});
