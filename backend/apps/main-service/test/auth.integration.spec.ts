import request from 'supertest';

import { NotificationsRepository } from '../src/modules/notifications/repositories/notifications.repository';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('AuthController integration', () => {
  it('registers with email OTP, then logs in, refreshes, and resolves the authenticated user', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const registerResponse = await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toEqual(
        expect.objectContaining({
          enrollmentId: expect.any(String),
          userId: expect.any(String),
          maskedEmail: expect.any(String),
          otpExpiresAt: expect.any(String),
          status: 'pending_activation',
        }),
      );

      const notificationsRepository = app.get(NotificationsRepository);
      const otpNotification = await notificationsRepository.findNotificationByDedupeKey(
        `auth-otp-${registerResponse.body.enrollmentId}`,
      );
      expect(otpNotification).toBeTruthy();

      if (!otpNotification) {
        throw new Error('OTP notification not found');
      }

      const otpMatch = otpNotification.message.match(/(\d{4,8})/);
      expect(otpMatch).toBeTruthy();

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/register/verify-email')
        .send({
          enrollmentId: registerResponse.body.enrollmentId,
          otp: otpMatch?.[1],
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            email: 'customer@example.com',
            role: 'customer',
          }),
        }),
      );

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'customer@example.com',
        password: 'password123',
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.accessToken).toEqual(expect.any(String));
      expect(loginResponse.body.refreshToken).toEqual(expect.any(String));

      const refreshResponse = await request(app.getHttpServer()).post('/api/auth/refresh').send({
        refreshToken: loginResponse.body.refreshToken,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
      expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));

      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual({
        userId: verifyResponse.body.user.id,
        email: 'customer@example.com',
        role: 'customer',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects duplicate registration, inactive pre-verification login, invalid refresh tokens, and missing bearer auth', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const duplicateRegister = await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(duplicateRegister.status).toBe(409);

      const inactiveLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'customer@example.com',
        password: 'password123',
      });
      expect(inactiveLogin.status).toBe(401);

      const invalidRefresh = await request(app.getHttpServer()).post('/api/auth/refresh').send({
        refreshToken: 'this-is-not-a-valid-refresh-token-at-all',
      });
      expect(invalidRefresh.status).toBe(401);

      const missingBearer = await request(app.getHttpServer()).get('/api/auth/me');
      expect(missingBearer.status).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('lets super admins provision and deactivate staff accounts', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'super.admin@example.com',
        password: 'password123',
        firstName: 'Sam',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'ADM-0001',
      });

      const adminLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'super.admin@example.com',
        password: 'password123',
      });
      expect(adminLogin.status).toBe(200);

      const createStaffResponse = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          email: 'staff@example.com',
          password: 'SecurePass123',
          firstName: 'Maria',
          lastName: 'Santos',
          role: 'service_adviser',
          staffCode: 'SA-0001',
        });

      expect(createStaffResponse.status).toBe(201);
      expect(createStaffResponse.body).toEqual(
        expect.objectContaining({
          email: 'staff@example.com',
          role: 'service_adviser',
          staffCode: 'SA-0001',
          isActive: false,
        }),
      );

      const staffLoginWhileInactive = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'staff@example.com',
        password: 'SecurePass123',
      });
      expect(staffLoginWhileInactive.status).toBe(401);

      const staffActivationStart = await request(app.getHttpServer())
        .post('/api/auth/staff-activation/google/start')
        .send({
          googleIdToken: 'google-id-token:staff@example.com:google-staff-1:Maria:Santos',
        });

      expect(staffActivationStart.status).toBe(201);

      const notificationsRepository = app.get(NotificationsRepository);
      const otpNotification = await notificationsRepository.findNotificationByDedupeKey(
        `auth-otp-${staffActivationStart.body.enrollmentId}`,
      );
      expect(otpNotification).toBeTruthy();

      if (!otpNotification) {
        throw new Error('OTP notification not found');
      }

      const otpMatch = otpNotification.message.match(/(\d{4,8})/);
      expect(otpMatch).toBeTruthy();

      const staffActivationVerify = await request(app.getHttpServer())
        .post('/api/auth/staff-activation/verify-email')
        .send({
          enrollmentId: staffActivationStart.body.enrollmentId,
          otp: otpMatch?.[1],
        });

      expect(staffActivationVerify.status).toBe(200);

      const staffLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'staff@example.com',
        password: 'SecurePass123',
      });
      expect(staffLogin.status).toBe(200);

      const deactivateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/staff-accounts/${createStaffResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          isActive: false,
        });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('blocks non-super-admin users from provisioning staff accounts', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'customer@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'customer@example.com',
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const forbiddenCreate = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          email: 'staff@example.com',
          password: 'SecurePass123',
          firstName: 'Maria',
          lastName: 'Santos',
          role: 'service_adviser',
          staffCode: 'SA-0001',
        });

      expect(forbiddenCreate.status).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('enrolls a customer with Google verification and email OTP activation', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const startResponse = await request(app.getHttpServer()).post('/api/auth/google/signup/start').send({
        googleIdToken: 'google-id-token:google.customer@example.com:google-subject-1:Gina:Verified',
      });

      expect(startResponse.status).toBe(201);
      expect(startResponse.body.status).toBe('pending_activation');
      expect(startResponse.body.enrollmentId).toBeTruthy();

      const notificationsRepository = app.get(NotificationsRepository);
      const otpNotification = await notificationsRepository.findNotificationByDedupeKey(
        `auth-otp-${startResponse.body.enrollmentId}`,
      );
      expect(otpNotification).toBeTruthy();

      if (!otpNotification) {
        throw new Error('OTP notification not found');
      }

      const otpMatch = otpNotification.message.match(/(\d{4,8})/);
      expect(otpMatch).toBeTruthy();

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/google/signup/verify-email')
        .send({
          enrollmentId: startResponse.body.enrollmentId,
          otp: otpMatch?.[1],
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
      expect(verifyResponse.body.user.email).toBe('google.customer@example.com');
    } finally {
      await app.close();
    }
  });
});
