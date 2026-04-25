import { ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';

import { NOTIFICATIONS_QUEUE_NAME } from '@main-modules/notifications/notifications.constants';
import { NotificationsRepository } from '@main-modules/notifications/repositories/notifications.repository';
import { NotificationTriggerPlannerService } from '@main-modules/notifications/services/notification-trigger-planner.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { SmtpMailService } from '@main-modules/notifications/services/smtp-mail.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { createNotificationTrigger } from '@shared/events/contracts/notification-triggers';
import { createCommerceEvent } from '@shared/events/contracts/commerce-events';

describe('NotificationsService', () => {
  it('enqueues insurance updates and tracks queued notifications', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        isActive: true,
      }),
    };

    const notificationsRepository = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue(null),
      getOrCreatePreferences: jest.fn().mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        emailEnabled: true,
        bookingRemindersEnabled: true,
        insuranceUpdatesEnabled: true,
        invoiceRemindersEnabled: true,
        serviceFollowUpEnabled: true,
      }),
      createNotification: jest.fn().mockResolvedValue({
        id: 'notification-1',
        userId: 'user-1',
        category: 'insurance_update',
        channel: 'email',
        sourceType: 'insurance_inquiry',
        sourceId: 'insurance-1',
        title: 'Insurance review update',
        message: 'Your insurance inquiry is now under review.',
        status: 'queued',
        dedupeKey: 'notification:insurance.inquiry_status_changed:insurance-1:under_review',
        scheduledFor: null,
        deliveredAt: null,
        attempts: [],
      }),
    };

    const notificationsQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME), useValue: notificationsQueue },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.enqueueNotification({
      userId: 'user-1',
      category: 'insurance_update',
      channel: 'email',
      sourceType: 'insurance_inquiry',
      sourceId: 'insurance-1',
      title: 'Insurance review update',
      message: 'Your insurance inquiry is now under review.',
      dedupeKey: 'notification:insurance.inquiry_status_changed:insurance-1:under_review',
    });

    expect(notificationsRepository.createNotification).toHaveBeenCalled();
    expect(notificationsQueue.add).toHaveBeenCalledWith(
      'deliver-notification',
      expect.objectContaining({
        notificationId: 'notification-1',
        userId: 'user-1',
      }),
      expect.objectContaining({
        jobId: 'notification__insurance.inquiry_status_changed__insurance-1__under_review',
      }),
    );
    expect(result.status).toBe('queued');
  });

  it('keeps reminder scheduling idempotent when the same dedupe key is reused', async () => {
    const notificationsRepository = {
      findReminderRuleByDedupeKey: jest.fn().mockResolvedValue({
        id: 'rule-1',
        dedupeKey: 'booking-1-reminder',
        status: 'scheduled',
      }),
      findNotificationByDedupeKey: jest.fn().mockResolvedValue({
        id: 'notification-1',
        dedupeKey: 'booking-1-reminder',
        status: 'queued',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.scheduleReminder({
      userId: 'user-1',
      reminderType: 'booking_reminder',
      channel: 'email',
      sourceType: 'booking',
      sourceId: 'booking-1',
      title: 'Upcoming appointment',
      message: 'Your booking is tomorrow at 9:00 AM.',
      scheduledFor: new Date('2026-04-20T08:00:00.000Z'),
      dedupeKey: 'booking-1-reminder',
    });

    expect(notificationsRepository.findReminderRuleByDedupeKey).toHaveBeenCalledWith(
      'booking-1-reminder',
    );
    expect(result.reminderRule.id).toBe('rule-1');
    expect(result.notification?.id).toBe('notification-1');
  });

  it('rejects customers trying to read another user notification preferences', async () => {
    const usersService = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'user-2',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          role: 'customer',
          isActive: true,
        }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: { getOrCreatePreferences: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    await expect(
      service.getPreferences('user-2', {
        userId: 'user-1',
        role: 'customer',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('queues auth OTP email delivery even when notification preferences disable reminders', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        isActive: true,
      }),
    };

    const notificationsRepository = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue(null),
      getOrCreatePreferences: jest.fn().mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        emailEnabled: false,
        bookingRemindersEnabled: false,
        insuranceUpdatesEnabled: false,
        invoiceRemindersEnabled: false,
        serviceFollowUpEnabled: false,
      }),
      createNotification: jest.fn().mockResolvedValue({
        id: 'notification-otp-1',
        userId: 'user-1',
        category: 'auth_otp',
        channel: 'email',
        sourceType: 'auth',
        sourceId: 'activation-1',
        title: 'Account verification code',
        message: 'Your AUTOCARE verification code is 112233. It expires soon.',
        status: 'queued',
        dedupeKey: 'otp-activation-1',
        scheduledFor: null,
        deliveredAt: null,
        attempts: [],
      }),
    };

    const notificationsQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME), useValue: notificationsQueue },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.enqueueAuthOtpDelivery({
      userId: 'user-1',
      email: 'customer@example.com',
      otp: '112233',
      activationContext: 'customer_signup',
      dedupeKey: 'otp-activation-1',
      sourceId: 'activation-1',
    });

    expect(notificationsRepository.createNotification).toHaveBeenCalled();
    expect(notificationsQueue.add).toHaveBeenCalled();
    expect(result.category).toBe('auth_otp');
    expect(result.channel).toBe('email');
  });

  it('dispatches queued auth OTP email through the SMTP transport', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        isActive: false,
      }),
    };

    const notificationsRepository = {
      findNotificationById: jest.fn().mockResolvedValue({
        id: 'notification-otp-1',
        userId: 'user-1',
        category: 'auth_otp',
        channel: 'email',
        sourceType: 'auth',
        sourceId: 'activation-1',
        title: 'Account verification code',
        message: 'Your AUTOCARE verification code is 112233. It expires soon.',
        status: 'queued',
        dedupeKey: 'otp-activation-1',
        attempts: [],
      }),
      createDeliveryAttempt: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
      updateNotificationStatus: jest.fn().mockResolvedValue({
        id: 'notification-otp-1',
        status: 'sent',
      }),
    };

    const smtpMailService = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SmtpMailService, useValue: smtpMailService },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.deliverNotification('notification-otp-1');

    expect(smtpMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Account verification code',
      }),
    );
    expect(notificationsRepository.createDeliveryAttempt).toHaveBeenCalled();
    expect(notificationsRepository.updateNotificationStatus).toHaveBeenCalledWith(
      'notification-otp-1',
      expect.objectContaining({ status: 'sent' }),
    );
    expect(result.status).toBe('sent');
  });

  it('maps back-job status triggers to queued operational notifications with stable dedupe keys', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        isActive: true,
      }),
    };

    const notificationsRepository = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue(null),
      getOrCreatePreferences: jest.fn().mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        emailEnabled: true,
        bookingRemindersEnabled: true,
        insuranceUpdatesEnabled: true,
        invoiceRemindersEnabled: true,
        serviceFollowUpEnabled: true,
      }),
      createNotification: jest.fn().mockResolvedValue({
        id: 'notification-back-job-1',
        userId: 'user-1',
        category: 'back_job_update',
        channel: 'email',
        sourceType: 'back_job',
        sourceId: 'back-job-1',
        title: 'Back-job status update',
        message: 'Your return or rework case is now resolved.',
        status: 'queued',
        dedupeKey: 'notification:back_job.status_changed:back-job-1:resolved',
        scheduledFor: null,
        deliveredAt: null,
        attempts: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME), useValue: { add: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.applyTrigger(
      createNotificationTrigger('back_job.status_changed', 'main-service.back-jobs', {
        backJobId: 'back-job-1',
        customerUserId: 'user-1',
        status: 'resolved',
      }),
    );

    expect(notificationsRepository.findNotificationByDedupeKey).toHaveBeenCalledWith(
      'notification:back_job.status_changed:back-job-1:resolved',
    );
    expect(notificationsRepository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'back_job_update',
        sourceType: 'back_job',
        sourceId: 'back-job-1',
      }),
    );
    expect(result.triggerName).toBe('back_job.status_changed');
  });

  it('cancels invoice-aging reminders when payment facts settle the invoice', async () => {
    const notificationsRepository = {
      cancelReminderRulesBySource: jest.fn().mockResolvedValue([{ id: 'rule-1', status: 'cancelled' }]),
      cancelNotificationsBySource: jest.fn().mockResolvedValue([{ id: 'notification-1', status: 'cancelled' }]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationTriggerPlannerService,
        { provide: NotificationsRepository, useValue: notificationsRepository },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: SmtpMailService, useValue: { sendMail: jest.fn() } },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);

    const result = await service.applyTrigger(
      createCommerceEvent('invoice.payment_recorded', {
        invoiceId: 'invoice-1',
        orderId: 'order-1',
        customerUserId: 'user-1',
        invoiceNumber: 'INV-2026-0001',
        paymentEntryId: 'payment-entry-1',
        amountCents: 99800,
        paymentMethod: 'cash',
        receivedAt: '2026-05-14T06:00:00.000Z',
        invoiceStatus: 'paid',
        amountPaidCents: 99800,
        amountDueCents: 0,
        currencyCode: 'PHP',
      }),
    );

    expect(notificationsRepository.cancelReminderRulesBySource).toHaveBeenCalledWith({
      sourceType: 'invoice_payment',
      sourceId: 'invoice-1',
      reminderType: 'invoice_aging',
    });
    expect(notificationsRepository.cancelNotificationsBySource).toHaveBeenCalledWith({
      sourceType: 'invoice_payment',
      sourceId: 'invoice-1',
      category: 'invoice_aging',
    });
    expect(result.triggerName).toBe('invoice.payment_recorded');
  });
});
