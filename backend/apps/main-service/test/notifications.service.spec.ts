import { ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';

import { NOTIFICATIONS_QUEUE_NAME } from '@main-modules/notifications/notifications.constants';
import { NotificationsRepository } from '@main-modules/notifications/repositories/notifications.repository';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { SmtpMailService } from '@main-modules/notifications/services/smtp-mail.service';
import { UsersService } from '@main-modules/users/services/users.service';

describe('NotificationsService', () => {
  it('enqueues insurance updates and tracks queued notifications', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        role: 'customer',
        isActive: true,
        profile: {
          phone: '+639171234567',
        },
      }),
    };

    const notificationsRepository = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue(null),
      getOrCreatePreferences: jest.fn().mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        emailEnabled: true,
        smsEnabled: true,
        bookingRemindersEnabled: true,
        insuranceUpdatesEnabled: true,
        invoiceRemindersEnabled: true,
        serviceFollowUpEnabled: true,
      }),
      createNotification: jest.fn().mockResolvedValue({
        id: 'notification-1',
        userId: 'user-1',
        category: 'insurance_update',
        channel: 'sms',
        sourceType: 'insurance_inquiry',
        sourceId: 'insurance-1',
        title: 'Insurance review update',
        message: 'Your insurance inquiry is now under review.',
        status: 'queued',
        dedupeKey: 'insurance-1-review-sms',
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
      channel: 'sms',
      sourceType: 'insurance_inquiry',
      sourceId: 'insurance-1',
      title: 'Insurance review update',
      message: 'Your insurance inquiry is now under review.',
      dedupeKey: 'insurance-1-review-sms',
    });

    expect(notificationsRepository.createNotification).toHaveBeenCalled();
    expect(notificationsQueue.add).toHaveBeenCalledWith(
      'deliver-notification',
      expect.objectContaining({
        notificationId: 'notification-1',
        userId: 'user-1',
      }),
      expect.objectContaining({
        jobId: 'insurance-1-review-sms',
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
      channel: 'sms',
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
        smsEnabled: false,
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
});
