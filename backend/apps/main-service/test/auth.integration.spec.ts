import request from 'supertest';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { MailDeliveryService } from '../src/modules/notifications/services/mail-delivery.service';
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
    const eventBus = app.get(AutocareEventBusService);

    try {
      eventBus.clearPublishedEvents();

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

      const rejectedClientPassword = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          password: 'ClientSuppliedPassword123',
          firstName: 'Maria',
          lastName: 'Santos',
          role: 'service_adviser',
          accountType: 'staff',
        });
      expect(rejectedClientPassword.status).toBe(400);

      const createStaffResponse = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          firstName: 'Maria',
          lastName: 'Santos',
          role: 'service_adviser',
          accountType: 'staff',
        });

      expect(createStaffResponse.status).toBe(201);
      expect(createStaffResponse.body).toEqual(
        expect.objectContaining({
          email: expect.stringMatching(/^maria\d{3}\.staff@autocare\.com$/),
          role: 'service_adviser',
          staffCode: expect.stringMatching(/^STA-\d{4}$/),
          isActive: true,
          delivery: {
            status: 'sent',
            channel: 'email',
            targetEmail: expect.stringMatching(/^maria\d{3}\.staff@autocare\.com$/),
            retryable: false,
          },
        }),
      );
      expect(createStaffResponse.body).not.toHaveProperty('temporaryPassword');
      expect(createStaffResponse.body).not.toHaveProperty('passwordHash');
      const generatedStaffEmail = createStaffResponse.body.email;
      const mailDelivery = app.get(MailDeliveryService) as unknown as {
        sentMessages: Array<{ to: string; text: string }>;
      };
      const credentialMail = mailDelivery.sentMessages.find((message) => message.to === generatedStaffEmail);
      const temporaryPassword = credentialMail?.text.match(/Temporary password: ([^\r\n]+)/)?.[1];
      expect(temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);

      const staffLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: generatedStaffEmail,
        password: temporaryPassword,
      });
      expect(staffLogin.status).toBe(200);
      expect(staffLogin.body).toEqual(
        expect.objectContaining({
          requiresPasswordChange: true,
          passwordChangeToken: expect.any(String),
          destination: '/api/auth/password/change-required',
        }),
      );
      expect(staffLogin.body).not.toHaveProperty('accessToken');
      expect(staffLogin.body).not.toHaveProperty('refreshToken');

      const restrictedDirectory = await request(app.getHttpServer())
        .get('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${staffLogin.body.passwordChangeToken}`);
      expect(restrictedDirectory.status).toBe(401);

      const passwordChangeResponse = await request(app.getHttpServer())
        .post('/api/auth/password/change-required')
        .send({
          passwordChangeToken: staffLogin.body.passwordChangeToken,
          newPassword: 'ChangedStaffPassword123',
        });
      expect(passwordChangeResponse.status).toBe(200);
      expect(passwordChangeResponse.body.accessToken).toEqual(expect.any(String));
      expect(passwordChangeResponse.body.refreshToken).toEqual(expect.any(String));

      const duplicateEmail = await request(app.getHttpServer())
        .post('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          email: generatedStaffEmail,
          staffCode: 'STA-9999',
          firstName: 'Duplicate',
          lastName: 'Email',
          role: 'service_adviser',
          accountType: 'staff',
        });
      expect(duplicateEmail.status).toBe(409);

      const staffListResponse = await request(app.getHttpServer())
        .get('/api/admin/staff-accounts')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`);
      expect(staffListResponse.status).toBe(200);
      expect(staffListResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createStaffResponse.body.id,
            accountType: 'staff',
            roleLabel: 'Staff',
          }),
        ]),
      );

      const deactivateResponse = await request(app.getHttpServer())
        .patch(`/api/admin/staff-accounts/${createStaffResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          isActive: false,
          reason: 'Temporarily deactivated pending compliance review.',
        });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);
      expect(eventBus.listPublishedEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'staff_account.provisioned',
            sourceDomain: 'main-service.auth',
            payload: expect.objectContaining({
              actorUserId: expect.any(String),
              targetUserId: createStaffResponse.body.id,
              targetEmail: generatedStaffEmail,
              targetStaffCode: createStaffResponse.body.staffCode,
            }),
          }),
          expect.objectContaining({
            name: 'staff_account.status_changed',
            sourceDomain: 'main-service.auth',
            payload: expect.objectContaining({
              targetUserId: createStaffResponse.body.id,
              previousIsActive: true,
              nextIsActive: false,
              reason: 'Temporarily deactivated pending compliance review.',
            }),
          }),
        ]),
      );
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

  it('soft deletes a customer account and allows the same email to register again', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const registerResponse = await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer.reuse@example.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Reuse',
      });

      const notificationsRepository = app.get(NotificationsRepository);
      const otpNotification = await notificationsRepository.findNotificationByDedupeKey(
        `auth-otp-${registerResponse.body.enrollmentId}`,
      );

      if (!otpNotification) {
        throw new Error('OTP notification not found');
      }

      const otpMatch = otpNotification.message.match(/(\d{4,8})/);

      const verifyResponse = await request(app.getHttpServer())
        .post('/api/auth/register/verify-email')
        .send({
          enrollmentId: registerResponse.body.enrollmentId,
          otp: otpMatch?.[1],
        });

      expect(verifyResponse.status).toBe(200);

      const deleteStartResponse = await request(app.getHttpServer())
        .post('/api/auth/account/delete/start')
        .set('Authorization', `Bearer ${verifyResponse.body.accessToken}`)
        .send({
          currentPassword: 'password123',
        });

      expect(deleteStartResponse.status).toBe(201);
      expect(deleteStartResponse.body.status).toBe('pending_delete_verification');

      const deleteOtpNotification = await notificationsRepository.findNotificationByDedupeKey(
        `auth-otp-${deleteStartResponse.body.enrollmentId}`,
      );

      if (!deleteOtpNotification) {
        throw new Error('Delete OTP notification not found');
      }

      const deleteOtpMatch = deleteOtpNotification.message.match(/(\d{4,8})/);

      const deleteVerifyResponse = await request(app.getHttpServer())
        .post('/api/auth/account/delete/verify')
        .set('Authorization', `Bearer ${verifyResponse.body.accessToken}`)
        .send({
          enrollmentId: deleteStartResponse.body.enrollmentId,
          otp: deleteOtpMatch?.[1],
        });

      expect(deleteVerifyResponse.status).toBe(200);
      expect(deleteVerifyResponse.body).toEqual({
        status: 'account_soft_deleted',
        message: 'The account was archived successfully. You can sign up again with the same email later.',
      });

      const loginAfterDelete = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'customer.reuse@example.com',
        password: 'password123',
      });
      expect(loginAfterDelete.status).toBe(401);

      const reRegisterResponse = await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'customer.reuse@example.com',
        password: 'NewPassword123',
        firstName: 'Jamie',
        lastName: 'Return',
      });

      expect(reRegisterResponse.status).toBe(201);
      expect(reRegisterResponse.body.status).toBe('pending_activation');
    } finally {
      await app.close();
    }
  });
});
