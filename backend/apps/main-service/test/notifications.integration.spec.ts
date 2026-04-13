import request from 'supertest';

import { NotificationsService } from '../src/modules/notifications/services/notifications.service';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('NotificationsController integration', () => {
  it('lets customers manage their own preferences and read queued notifications', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'notify.customer@example.com',
        password: 'password123',
        firstName: 'Nina',
        lastName: 'Notify',
        phone: '+639171234567',
      });

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'notify.customer@example.com',
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const preferencesResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(preferencesResponse.status).toBe(200);
      expect(preferencesResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          emailEnabled: true,
        }),
      );

      const updatedPreferencesResponse = await request(app.getHttpServer())
        .patch(`/api/users/${customer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          bookingRemindersEnabled: false,
        });
      expect(updatedPreferencesResponse.status).toBe(200);
      expect(updatedPreferencesResponse.body.emailEnabled).toBe(true);
      expect(updatedPreferencesResponse.body.bookingRemindersEnabled).toBe(false);

      const notificationsService = app.get(NotificationsService);
      const bookingNotification = await notificationsService.scheduleReminder({
        userId: customer.id,
        reminderType: 'booking_reminder',
        channel: 'email',
        sourceType: 'booking',
        sourceId: 'booking-1',
        title: 'Upcoming booking reminder',
        message: 'Your appointment is tomorrow at 9:00 AM.',
        scheduledFor: new Date('2026-04-20T09:00:00.000Z'),
        dedupeKey: 'booking-1-reminder-email',
      });
      expect(bookingNotification.notification?.status).toBe('skipped');

      const insuranceNotification = await notificationsService.enqueueNotification({
        userId: customer.id,
        category: 'insurance_update',
        channel: 'email',
        sourceType: 'insurance_inquiry',
        sourceId: 'insurance-1',
        title: 'Insurance inquiry update',
        message: 'Your insurance inquiry is now under review.',
        dedupeKey: 'insurance-1-email',
      });
      expect(insuranceNotification.status).toBe('queued');

      const notificationsResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notifications`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dedupeKey: 'booking-1-reminder-email',
            status: 'skipped',
          }),
          expect.objectContaining({
            dedupeKey: 'insurance-1-email',
            status: 'queued',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects foreign customer access but allows service advisers to read customer notification state', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'customer.one@example.com',
        password: 'password123',
        firstName: 'Cara',
        lastName: 'Owner',
        phone: '+639181111111',
      });
      const otherCustomer = await seedAuthUser({
        email: 'customer.two@example.com',
        password: 'password123',
        firstName: 'Omar',
        lastName: 'Other',
        phone: '+639182222222',
      });
      await seedAuthUser({
        email: 'adviser.notify@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1011',
        phone: '+639183333333',
      });

      const [customerLogin, adviserLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'customer.two@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'adviser.notify@example.com',
          password: 'password123',
        }),
      ]);

      const foreignPreferencesResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(foreignPreferencesResponse.status).toBe(403);

      const adviserPreferencesResponse = await request(app.getHttpServer())
        .get(`/api/users/${otherCustomer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(adviserPreferencesResponse.status).toBe(200);

      const adviserNotificationsResponse = await request(app.getHttpServer())
        .get(`/api/users/${otherCustomer.id}/notifications`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(adviserNotificationsResponse.status).toBe(200);
      expect(Array.isArray(adviserNotificationsResponse.body)).toBe(true);
    } finally {
      await app.close();
    }
  });
});
