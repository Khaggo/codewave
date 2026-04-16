import request from 'supertest';

import { NotificationsService } from '../src/modules/notifications/services/notifications.service';
import { createNotificationTrigger } from '@shared/events/contracts/notification-triggers';
import { createCommerceEvent } from '@shared/events/contracts/commerce-events';

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

  it('applies cross-domain notification triggers with dedupe and invoice-aging cancellation', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'trigger.customer@example.com',
        password: 'password123',
        firstName: 'Tina',
        lastName: 'Trigger',
        phone: '+639184444444',
      });

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'trigger.customer@example.com',
        password: 'password123',
      });
      expect(customerLogin.status).toBe(200);

      const notificationsService = app.get(NotificationsService);

      const bookingTriggerResult = await notificationsService.applyTrigger(
        createNotificationTrigger('booking.reminder_requested', 'main-service.bookings', {
          bookingId: 'booking-trigger-1',
          userId: customer.id,
          scheduledFor: '2026-04-21T01:00:00.000Z',
          appointmentStartsAt: '2026-04-21T09:00:00.000Z',
        }),
      );
      expect(bookingTriggerResult.actionResults).toHaveLength(1);

      const duplicateBookingTriggerResult = await notificationsService.applyTrigger(
        createNotificationTrigger('booking.reminder_requested', 'main-service.bookings', {
          bookingId: 'booking-trigger-1',
          userId: customer.id,
          scheduledFor: '2026-04-21T01:00:00.000Z',
          appointmentStartsAt: '2026-04-21T09:00:00.000Z',
        }),
      );
      expect(duplicateBookingTriggerResult.actionResults).toHaveLength(1);

      await notificationsService.applyTrigger(
        createNotificationTrigger('back_job.status_changed', 'main-service.back-jobs', {
          backJobId: 'back-job-trigger-1',
          customerUserId: customer.id,
          status: 'resolved',
        }),
      );

      await notificationsService.applyTrigger(
        createCommerceEvent('order.invoice_issued', {
          orderId: 'order-trigger-1',
          orderNumber: 'ORD-2026-0201',
          invoiceId: 'invoice-trigger-1',
          invoiceNumber: 'INV-2026-0201',
          customerUserId: customer.id,
          totalCents: 420000,
          amountDueCents: 420000,
          currencyCode: 'PHP',
          dueAt: '2026-04-25T08:00:00.000Z',
        }),
      );

      const cancelResult = await notificationsService.applyTrigger(
        createCommerceEvent('invoice.payment_recorded', {
          invoiceId: 'invoice-trigger-1',
          orderId: 'order-trigger-1',
          customerUserId: customer.id,
          invoiceNumber: 'INV-2026-0201',
          paymentEntryId: 'payment-entry-trigger-1',
          amountCents: 420000,
          paymentMethod: 'cash',
          receivedAt: '2026-04-22T09:00:00.000Z',
          invoiceStatus: 'paid',
          amountPaidCents: 420000,
          amountDueCents: 0,
          currencyCode: 'PHP',
        }),
      );
      expect(cancelResult.actionResults).toHaveLength(2);

      const notificationsResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notifications`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'booking_reminder',
            sourceId: 'booking-trigger-1',
          }),
          expect.objectContaining({
            category: 'back_job_update',
            sourceId: 'back-job-trigger-1',
            status: 'queued',
          }),
          expect.objectContaining({
            category: 'invoice_aging',
            sourceId: 'invoice-trigger-1',
            status: 'cancelled',
          }),
        ]),
      );

      const invoiceAgingNotifications = notificationsResponse.body.filter(
        (notification: { category: string; sourceId: string }) =>
          notification.category === 'invoice_aging' && notification.sourceId === 'invoice-trigger-1',
      );
      expect(invoiceAgingNotifications).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
});
