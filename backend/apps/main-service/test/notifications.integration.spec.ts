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

  it('creates customer feed entries from live booking and insurance workflow events', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    type FeedNotification = {
      category: string;
      sourceId: string;
      status: string;
      attempts?: Array<{ status: string; errorMessage?: string | null }>;
      dedupeKey?: string;
    };

    try {
      const adviser = await seedAuthUser({
        email: 'workflow.notify.adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-NOTIFY-1',
      });
      const customer = await seedAuthUser({
        email: 'workflow.notify.customer@example.com',
        password: 'password123',
        firstName: 'Nico',
        lastName: 'Workflow',
        phone: '+639185555555',
      });

      const [adviserLogin, customerLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: adviser.email,
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: customer.email,
          password: 'password123',
        }),
      ]);
      expect(adviserLogin.status).toBe(200);
      expect(customerLogin.status).toBe(200);

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customer.id,
        plateNumber: 'NTF535',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const [servicesResponse, timeSlotsResponse] = await Promise.all([
        request(app.getHttpServer()).get('/api/services'),
        request(app.getHttpServer()).get('/api/time-slots'),
      ]);
      expect(servicesResponse.status).toBe(200);
      expect(timeSlotsResponse.status).toBe(200);

      const disabledPreferencesResponse = await request(app.getHttpServer())
        .patch(`/api/users/${customer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          bookingRemindersEnabled: false,
        });
      expect(disabledPreferencesResponse.status).toBe(200);
      expect(disabledPreferencesResponse.body.bookingRemindersEnabled).toBe(false);

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: customer.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-20',
        serviceIds: [servicesResponse.body[0].id],
      });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'confirmed',
          reason: 'Confirmed for notification workflow smoke.',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const skippedFeedResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notifications`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(skippedFeedResponse.status).toBe(200);
      const skippedBookingNotification = skippedFeedResponse.body.find(
        (notification: FeedNotification) =>
          notification.category === 'booking_reminder' &&
          notification.sourceId === bookingResponse.body.id &&
          notification.status === 'skipped',
      );
      expect(skippedBookingNotification).toEqual(
        expect.objectContaining({
          dedupeKey: expect.stringContaining('notification:booking.reminder_requested:'),
        }),
      );
      expect(skippedBookingNotification?.attempts ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'skipped',
            errorMessage: expect.stringContaining('booking_reminder'),
          }),
        ]),
      );

      const enabledPreferencesResponse = await request(app.getHttpServer())
        .patch(`/api/users/${customer.id}/notification-preferences`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          bookingRemindersEnabled: true,
        });
      expect(enabledPreferencesResponse.status).toBe(200);
      expect(enabledPreferencesResponse.body.bookingRemindersEnabled).toBe(true);

      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/api/bookings/${bookingResponse.body.id}/reschedule`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          timeSlotId: timeSlotsResponse.body[1].id,
          scheduledDate: '2026-04-21',
          reason: 'Rescheduled after preferences were restored.',
        });
      expect(rescheduleResponse.status).toBe(200);

      const createInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Notification insurance workflow',
          description: 'Customer checks whether insurance review updates appear in the feed.',
        });
      expect(createInquiryResponse.status).toBe(201);

      const insuranceStatusResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'under_review',
          reviewNotes: 'Review started for notification workflow smoke.',
        });
      expect(insuranceStatusResponse.status).toBe(200);

      const liveFeedResponse = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/notifications`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(liveFeedResponse.status).toBe(200);
      expect(liveFeedResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'booking_reminder',
            sourceId: bookingResponse.body.id,
            status: 'queued',
          }),
          expect.objectContaining({
            category: 'insurance_update',
            sourceId: createInquiryResponse.body.id,
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
