import request from 'supertest';
import { randomUUID } from 'crypto';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

type TestApp = Awaited<ReturnType<typeof createMainServiceTestApp>>;
type SeedAuthPayload = Parameters<TestApp['seedAuthUser']>[0];
type SeededUser = Awaited<ReturnType<TestApp['seedAuthUser']>> & {
  accessToken: string;
};

describe('RBAC regression matrix', () => {
  let app: TestApp['app'];
  let seedAuthUser: TestApp['seedAuthUser'];

  let ownerCustomer: SeededUser;
  let foreignCustomer: SeededUser;
  let assignedTechnician: SeededUser;
  let unassignedTechnician: SeededUser;
  let serviceAdviser: SeededUser;
  let superAdmin: SeededUser;
  let staffTarget: SeededUser;

  let vehicleId: string;
  let insuranceInquiryId: string;
  let assignedJobOrderId: string;
  let blockedQaJobOrderId: string;

  async function seedAndLogin(payload: SeedAuthPayload): Promise<SeededUser> {
    const user = await seedAuthUser(payload);

    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: payload.email,
      password: payload.password,
    });

    expect(loginResponse.status).toBe(200);

    return {
      ...user,
      accessToken: loginResponse.body.accessToken as string,
    };
  }

  async function createConfirmedBooking(scheduledDate: string, timeSlotId: string, serviceId: string) {
    const createBookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
      userId: ownerCustomer.id,
      vehicleId,
      timeSlotId,
      scheduledDate,
      serviceIds: [serviceId],
      notes: `RBAC booking for ${scheduledDate}`,
    });

    expect(createBookingResponse.status).toBe(201);

    const confirmBookingResponse = await request(app.getHttpServer())
      .patch(`/api/bookings/${createBookingResponse.body.id}/status`)
      .set('Authorization', `Bearer ${serviceAdviser.accessToken}`)
      .send({
        status: 'confirmed',
      });

    expect(confirmBookingResponse.status).toBe(200);

    return createBookingResponse.body.id as string;
  }

  async function createAssignedJobOrder(bookingId: string, notes: string) {
    const createJobOrderResponse = await request(app.getHttpServer())
      .post('/api/job-orders')
      .set('Authorization', `Bearer ${serviceAdviser.accessToken}`)
      .send({
        sourceType: 'booking',
        sourceId: bookingId,
        customerUserId: ownerCustomer.id,
        vehicleId,
        serviceAdviserUserId: serviceAdviser.id,
        serviceAdviserCode: serviceAdviser.staffCode,
        notes,
        items: [
          {
            name: 'Inspect and resolve reported concern',
            description: notes,
          },
        ],
        assignedTechnicianIds: [assignedTechnician.id],
      });

    expect(createJobOrderResponse.status).toBe(201);

    return {
      id: createJobOrderResponse.body.id as string,
      firstItemId: createJobOrderResponse.body.items[0].id as string,
    };
  }

  beforeAll(async () => {
    const testApp = await createMainServiceTestApp();
    app = testApp.app;
    seedAuthUser = testApp.seedAuthUser;

    ownerCustomer = await seedAndLogin({
      email: 'rbac.customer.owner@example.com',
      password: 'password123',
      firstName: 'Olive',
      lastName: 'Owner',
      role: 'customer',
    });

    foreignCustomer = await seedAndLogin({
      email: 'rbac.customer.foreign@example.com',
      password: 'password123',
      firstName: 'Faye',
      lastName: 'Foreign',
      role: 'customer',
    });

    assignedTechnician = await seedAndLogin({
      email: 'rbac.technician.assigned@example.com',
      password: 'password123',
      firstName: 'Tino',
      lastName: 'Assigned',
      role: 'technician',
      staffCode: 'TECH-RBAC-1',
    });

    unassignedTechnician = await seedAndLogin({
      email: 'rbac.technician.unassigned@example.com',
      password: 'password123',
      firstName: 'Una',
      lastName: 'Assigned',
      role: 'technician',
      staffCode: 'TECH-RBAC-2',
    });

    serviceAdviser = await seedAndLogin({
      email: 'rbac.adviser@example.com',
      password: 'password123',
      firstName: 'Ari',
      lastName: 'Adviser',
      role: 'service_adviser',
      staffCode: 'SA-RBAC-1',
    });

    superAdmin = await seedAndLogin({
      email: 'rbac.superadmin@example.com',
      password: 'password123',
      firstName: 'Sage',
      lastName: 'Admin',
      role: 'super_admin',
      staffCode: 'ADMIN-RBAC-1',
    });

    staffTarget = await seedAndLogin({
      email: 'rbac.staff.target@example.com',
      password: 'password123',
      firstName: 'Taylor',
      lastName: 'Target',
      role: 'technician',
      staffCode: 'TECH-RBAC-3',
    });

    const servicesResponse = await request(app.getHttpServer()).get('/api/services');
    const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

    expect(servicesResponse.status).toBe(200);
    expect(timeSlotsResponse.status).toBe(200);

    const serviceId = servicesResponse.body[0].id as string;
    const timeSlotId = timeSlotsResponse.body[0].id as string;

    const createVehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
      userId: ownerCustomer.id,
      plateNumber: 'RBAC-001',
      make: 'Toyota',
      model: 'Fortuner',
      year: 2024,
    });
    expect(createVehicleResponse.status).toBe(201);
    vehicleId = createVehicleResponse.body.id as string;

    const createInsuranceInquiryResponse = await request(app.getHttpServer())
      .post('/api/insurance/inquiries')
      .set('Authorization', `Bearer ${ownerCustomer.accessToken}`)
      .send({
        userId: ownerCustomer.id,
        vehicleId,
        inquiryType: 'comprehensive',
        subject: 'Front bumper insurance review',
        description: 'Customer needs claim support after a low-speed collision.',
      });
    expect(createInsuranceInquiryResponse.status).toBe(201);
    insuranceInquiryId = createInsuranceInquiryResponse.body.id as string;

    const assignedBookingId = await createConfirmedBooking('2026-08-10', timeSlotId, serviceId);
    const blockedQaBookingId = await createConfirmedBooking('2026-08-11', timeSlotId, serviceId);

    const assignedJobOrder = await createAssignedJobOrder(
      assignedBookingId,
      'Create a technician-visible job order for RBAC matrix checks.',
    );
    assignedJobOrderId = assignedJobOrder.id;

    const moveAssignedJobOrderInProgressResponse = await request(app.getHttpServer())
      .patch(`/api/job-orders/${assignedJobOrderId}/status`)
      .set('Authorization', `Bearer ${assignedTechnician.accessToken}`)
      .send({
        status: 'in_progress',
      });
    expect(moveAssignedJobOrderInProgressResponse.status).toBe(200);

    const blockedQaJobOrder = await createAssignedJobOrder(
      blockedQaBookingId,
      'Leave this job order incomplete so the QA gate stays blocked for override tests.',
    );
    blockedQaJobOrderId = blockedQaJobOrder.id;

    const moveBlockedQaInProgressResponse = await request(app.getHttpServer())
      .patch(`/api/job-orders/${blockedQaJobOrderId}/status`)
      .set('Authorization', `Bearer ${assignedTechnician.accessToken}`)
      .send({
        status: 'in_progress',
      });
    expect(moveBlockedQaInProgressResponse.status).toBe(200);

    const moveBlockedQaReadyResponse = await request(app.getHttpServer())
      .patch(`/api/job-orders/${blockedQaJobOrderId}/status`)
      .set('Authorization', `Bearer ${assignedTechnician.accessToken}`)
      .send({
        status: 'ready_for_qa',
      });
    expect(moveBlockedQaReadyResponse.status).toBe(200);

    const blockedQaResponse = await request(app.getHttpServer())
      .get(`/api/job-orders/${blockedQaJobOrderId}/qa`)
      .set('Authorization', `Bearer ${serviceAdviser.accessToken}`);
    expect(blockedQaResponse.status).toBe(200);
    expect(blockedQaResponse.body.status).toBe('blocked');
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps route-level staff and admin boundaries closed for lower roles', async () => {
    const meExpectations = [
      { actor: ownerCustomer, expectedStatus: 200, expectedRole: 'customer' },
      { actor: unassignedTechnician, expectedStatus: 200, expectedRole: 'technician' },
      { actor: serviceAdviser, expectedStatus: 200, expectedRole: 'service_adviser' },
      { actor: superAdmin, expectedStatus: 200, expectedRole: 'super_admin' },
    ] as const;

    for (const expectation of meExpectations) {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
      expect(response.body.role).toBe(expectation.expectedRole);
    }

    const scheduleExpectations = [
      { actor: ownerCustomer, expectedStatus: 403 },
      { actor: unassignedTechnician, expectedStatus: 403 },
      { actor: serviceAdviser, expectedStatus: 200 },
      { actor: superAdmin, expectedStatus: 200 },
    ] as const;

    for (const expectation of scheduleExpectations) {
      const response = await request(app.getHttpServer())
        .get('/api/bookings/daily-schedule')
        .query({ scheduledDate: '2026-08-10' })
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }

    const chatbotIntentExpectations = [
      { actor: ownerCustomer, expectedStatus: 403 },
      { actor: unassignedTechnician, expectedStatus: 403 },
      { actor: serviceAdviser, expectedStatus: 200 },
      { actor: superAdmin, expectedStatus: 200 },
    ] as const;

    for (const expectation of chatbotIntentExpectations) {
      const response = await request(app.getHttpServer())
        .get('/api/chatbot/intents')
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }

    const deniedProvisionActors = [ownerCustomer, unassignedTechnician, serviceAdviser] as const;

    for (const actor of deniedProvisionActors) {
      const deniedResponse = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          email: `blocked-${randomUUID()}@example.com`,
          password: 'SecurePass123',
          role: 'technician',
          staffCode: `TECH-${randomUUID().slice(0, 8)}`,
          firstName: 'Blocked',
          lastName: 'Actor',
        });

      expect(deniedResponse.status).toBe(403);
    }

    const createStaffAccountResponse = await request(app.getHttpServer())
      .post('/api/admin/staff-accounts')
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({
        email: `provisioned-${randomUUID()}@example.com`,
        password: 'SecurePass123',
        role: 'technician',
        staffCode: `TECH-${randomUUID().slice(0, 8)}`,
        firstName: 'Provisioned',
        lastName: 'Technician',
      });

    expect(createStaffAccountResponse.status).toBe(201);

    const deniedStatusActors = [ownerCustomer, unassignedTechnician, serviceAdviser] as const;

    for (const actor of deniedStatusActors) {
      const deniedResponse = await request(app.getHttpServer())
        .patch(`/api/admin/staff-accounts/${staffTarget.id}/status`)
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          isActive: false,
        });

      expect(deniedResponse.status).toBe(403);
    }

    const updateStaffStatusResponse = await request(app.getHttpServer())
      .patch(`/api/admin/staff-accounts/${staffTarget.id}/status`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({
        isActive: false,
      });

    expect(updateStaffStatusResponse.status).toBe(200);
    expect(updateStaffStatusResponse.body.isActive).toBe(false);
  });

  it('enforces ownership boundaries for customer-scoped insurance and notification routes', async () => {
    const insuranceReadExpectations = [
      { actor: ownerCustomer, expectedStatus: 200 },
      { actor: foreignCustomer, expectedStatus: 403 },
      { actor: unassignedTechnician, expectedStatus: 403 },
      { actor: serviceAdviser, expectedStatus: 200 },
      { actor: superAdmin, expectedStatus: 200 },
    ] as const;

    for (const expectation of insuranceReadExpectations) {
      const response = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${insuranceInquiryId}`)
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }

    const notificationPreferenceExpectations = [
      { actor: ownerCustomer, targetUserId: ownerCustomer.id, expectedStatus: 200 },
      { actor: foreignCustomer, targetUserId: ownerCustomer.id, expectedStatus: 403 },
      { actor: unassignedTechnician, targetUserId: ownerCustomer.id, expectedStatus: 403 },
      { actor: serviceAdviser, targetUserId: ownerCustomer.id, expectedStatus: 200 },
      { actor: superAdmin, targetUserId: ownerCustomer.id, expectedStatus: 200 },
    ] as const;

    for (const expectation of notificationPreferenceExpectations) {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${expectation.targetUserId}/notification-preferences`)
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }
  });

  it('enforces assignment, technician-only progress, and super-admin-only QA override paths', async () => {
    const jobOrderReadExpectations = [
      { actor: assignedTechnician, expectedStatus: 200 },
      { actor: unassignedTechnician, expectedStatus: 403 },
      { actor: serviceAdviser, expectedStatus: 200 },
      { actor: superAdmin, expectedStatus: 200 },
      { actor: ownerCustomer, expectedStatus: 403 },
    ] as const;

    for (const expectation of jobOrderReadExpectations) {
      const response = await request(app.getHttpServer())
        .get(`/api/job-orders/${assignedJobOrderId}`)
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }

    const progressDeniedActors = [ownerCustomer, unassignedTechnician, serviceAdviser, superAdmin] as const;

    for (const actor of progressDeniedActors) {
      const deniedResponse = await request(app.getHttpServer())
        .post(`/api/job-orders/${assignedJobOrderId}/progress`)
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          entryType: 'work_started',
          message: 'This role should not be allowed to append technician progress.',
        });

      expect(deniedResponse.status).toBe(403);
    }

    const addProgressResponse = await request(app.getHttpServer())
      .post(`/api/job-orders/${assignedJobOrderId}/progress`)
      .set('Authorization', `Bearer ${assignedTechnician.accessToken}`)
      .send({
        entryType: 'work_started',
        message: 'Assigned technician can append progress evidence.',
      });

    expect(addProgressResponse.status).toBe(200);

    const qaReadExpectations = [
      { actor: assignedTechnician, expectedStatus: 200 },
      { actor: unassignedTechnician, expectedStatus: 403 },
      { actor: serviceAdviser, expectedStatus: 200 },
      { actor: superAdmin, expectedStatus: 200 },
      { actor: ownerCustomer, expectedStatus: 403 },
    ] as const;

    for (const expectation of qaReadExpectations) {
      const response = await request(app.getHttpServer())
        .get(`/api/job-orders/${blockedQaJobOrderId}/qa`)
        .set('Authorization', `Bearer ${expectation.actor.accessToken}`);

      expect(response.status).toBe(expectation.expectedStatus);
    }

    const overrideDeniedActors = [ownerCustomer, assignedTechnician, serviceAdviser] as const;

    for (const actor of overrideDeniedActors) {
      const deniedResponse = await request(app.getHttpServer())
        .patch(`/api/job-orders/${blockedQaJobOrderId}/qa/override`)
        .set('Authorization', `Bearer ${actor.accessToken}`)
        .send({
          reason: 'This role should not be allowed to override blocked QA release.',
        });

      expect(deniedResponse.status).toBe(403);
    }

    const overrideResponse = await request(app.getHttpServer())
      .patch(`/api/job-orders/${blockedQaJobOrderId}/qa/override`)
      .set('Authorization', `Bearer ${superAdmin.accessToken}`)
      .send({
        reason: 'Super admin approved release after manual review of the blocked QA evidence.',
      });

    expect(overrideResponse.status).toBe(200);
    expect(overrideResponse.body.status).toBe('overridden');
  });
});
