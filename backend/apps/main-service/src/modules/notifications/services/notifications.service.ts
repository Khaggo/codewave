import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { UsersService } from '@main-modules/users/services/users.service';
import { AnyCommerceEventEnvelope } from '@shared/events/contracts/commerce-events';
import { AnyNotificationTriggerEnvelope } from '@shared/events/contracts/notification-triggers';

import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import { NOTIFICATIONS_QUEUE_NAME } from '../notifications.constants';
import { NotificationsRepository } from '../repositories/notifications.repository';
import {
  notificationCategoryEnum,
  notificationChannelEnum,
  notificationSourceTypeEnum,
} from '../schemas/notifications.schema';
import {
  NotificationTriggerPlanAction,
  NotificationTriggerPlannerService,
} from './notification-trigger-planner.service';
import { SmtpMailService } from './smtp-mail.service';

type NotificationActor = {
  userId: string;
  role: string;
};

type NotificationCategory = (typeof notificationCategoryEnum.enumValues)[number];
type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];
type NotificationSourceType = (typeof notificationSourceTypeEnum.enumValues)[number];

type EnqueueNotificationInput = {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  message: string;
  dedupeKey: string;
  scheduledFor?: Date;
  allowInactive?: boolean;
};

type ScheduleReminderInput = {
  userId: string;
  reminderType: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  message: string;
  scheduledFor: Date;
  dedupeKey: string;
};

type EnqueueAuthOtpDeliveryInput = {
  userId: string;
  email: string;
  otp: string;
  activationContext: 'customer_signup' | 'staff_activation';
  dedupeKey: string;
  sourceId: string;
  scheduledFor?: Date;
};

const roleAccess = ['customer', 'service_adviser', 'super_admin'] as const;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersService: UsersService,
    private readonly notificationTriggerPlanner: NotificationTriggerPlannerService,
    private readonly smtpMailService: SmtpMailService,
    @InjectQueue(NOTIFICATIONS_QUEUE_NAME)
    private readonly notificationsQueue: Queue,
  ) {}

  async getPreferences(userId: string, actor: NotificationActor) {
    await this.assertCanAccessUserNotifications(userId, actor);
    return this.notificationsRepository.getOrCreatePreferences(userId);
  }

  async updatePreferences(userId: string, payload: UpdateNotificationPreferencesDto, actor: NotificationActor) {
    await this.assertCanAccessUserNotifications(userId, actor);
    return this.notificationsRepository.updatePreferences(userId, payload);
  }

  async listNotifications(userId: string, actor: NotificationActor) {
    await this.assertCanAccessUserNotifications(userId, actor);
    const notifications = await this.notificationsRepository.listNotificationsByUserId(userId);
    return notifications.filter((notification) => notification.category !== 'auth_otp');
  }

  async enqueueNotification(payload: EnqueueNotificationInput) {
    const existingNotification = await this.notificationsRepository.findNotificationByDedupeKey(payload.dedupeKey);
    if (existingNotification) {
      return existingNotification;
    }

    const user = await this.assertTargetUser(payload.userId, payload.allowInactive ?? false);
    const preferences = await this.notificationsRepository.getOrCreatePreferences(payload.userId);
    const skipReason = this.getSkipReason({
      user,
      preferences,
      category: payload.category,
      channel: payload.channel,
    });

    if (skipReason) {
      return this.recordSkippedNotification(payload, skipReason);
    }

    const notification = await this.notificationsRepository.createNotification({
      ...payload,
      status: 'queued',
      scheduledFor: payload.scheduledFor ?? null,
    });

    await this.notificationsQueue.add(
      'deliver-notification',
      {
        notificationId: notification.id,
        userId: payload.userId,
        channel: payload.channel,
        category: payload.category,
      },
      {
        jobId: payload.dedupeKey,
        delay: payload.scheduledFor
          ? Math.max(payload.scheduledFor.getTime() - Date.now(), 0)
          : 0,
      },
    );

    return notification;
  }

  async scheduleReminder(payload: ScheduleReminderInput) {
    const existingReminderRule = await this.notificationsRepository.findReminderRuleByDedupeKey(payload.dedupeKey);
    if (existingReminderRule) {
      const existingNotification = await this.notificationsRepository.findNotificationByDedupeKey(payload.dedupeKey);
      return {
        reminderRule: existingReminderRule,
        notification: existingNotification,
      };
    }

    const reminderRule = await this.notificationsRepository.createReminderRule({
      userId: payload.userId,
      reminderType: payload.reminderType,
      channel: payload.channel,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      scheduledFor: payload.scheduledFor,
      dedupeKey: payload.dedupeKey,
    });

    const notification = await this.enqueueNotification({
      userId: payload.userId,
      category: payload.reminderType,
      channel: payload.channel,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      title: payload.title,
      message: payload.message,
      dedupeKey: payload.dedupeKey,
      scheduledFor: payload.scheduledFor,
    });

    return {
      reminderRule,
      notification,
    };
  }

  async enqueueAuthOtpDelivery(payload: EnqueueAuthOtpDeliveryInput) {
    const user = await this.assertTargetUser(payload.userId, true);
    if (user.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) {
      throw new ConflictException('Auth OTP email target does not match the account email');
    }

    const message =
      payload.activationContext === 'staff_activation'
        ? `Your AUTOCARE staff activation code is ${payload.otp}. It expires soon.`
        : `Your AUTOCARE verification code is ${payload.otp}. It expires soon.`;

    return this.enqueueNotification({
      userId: payload.userId,
      category: 'auth_otp',
      channel: 'email',
      sourceType: 'auth',
      sourceId: payload.sourceId,
      title: 'Account verification code',
      message,
      dedupeKey: payload.dedupeKey,
      scheduledFor: payload.scheduledFor,
      allowInactive: true,
    });
  }

  async applyTrigger(trigger: AnyNotificationTriggerEnvelope | AnyCommerceEventEnvelope) {
    const plan = this.notificationTriggerPlanner.plan(trigger);
    const actionResults: Array<{
      kind: NotificationTriggerPlanAction['kind'];
      result: unknown;
    }> = [];

    for (const action of plan.actions) {
      if (action.kind === 'enqueue_notification') {
        const notification = await this.enqueueNotification({
          userId: action.userId,
          category: action.category,
          channel: action.channel,
          sourceType: action.sourceType,
          sourceId: action.sourceId,
          title: action.title,
          message: action.message,
          dedupeKey: action.dedupeKey,
        });

        actionResults.push({
          kind: action.kind,
          result: notification,
        });
        continue;
      }

      if (action.kind === 'schedule_reminder') {
        const reminder = await this.scheduleReminder({
          userId: action.userId,
          reminderType: action.category,
          channel: action.channel,
          sourceType: action.sourceType,
          sourceId: action.sourceId,
          title: action.title,
          message: action.message,
          scheduledFor: action.scheduledFor,
          dedupeKey: action.dedupeKey,
        });

        actionResults.push({
          kind: action.kind,
          result: reminder,
        });
        continue;
      }

      if (action.kind === 'cancel_notifications') {
        const notifications = await this.notificationsRepository.cancelNotificationsBySource({
          sourceType: action.sourceType,
          sourceId: action.sourceId,
          category: action.category,
        });

        actionResults.push({
          kind: action.kind,
          result: {
            reason: action.reason,
            notifications,
          },
        });
        continue;
      }

      const reminderRules = await this.notificationsRepository.cancelReminderRulesBySource({
        sourceType: action.sourceType,
        sourceId: action.sourceId,
        reminderType: action.reminderType,
      });

      actionResults.push({
        kind: action.kind,
        result: {
          reason: action.reason,
          reminderRules,
        },
      });
    }

    return {
      triggerName: plan.triggerName,
      sourceDomain: plan.sourceDomain,
      dedupePolicy: plan.dedupePolicy,
      retryPolicy: plan.retryPolicy,
      actionResults,
    };
  }

  async deliverNotification(notificationId: string) {
    const notification = await this.notificationsRepository.findNotificationById(notificationId);
    if (notification.status === 'sent' || notification.status === 'cancelled') {
      return notification;
    }

    const user = await this.assertTargetUser(notification.userId, true);
    const attemptNumber = notification.attempts.length + 1;

    try {
      const result = await this.smtpMailService.sendMail({
        to: user.email,
        subject: notification.title,
        text: notification.message,
      });

      await this.notificationsRepository.createDeliveryAttempt({
        notificationId,
        attemptNumber,
        status: 'sent',
        providerMessageId: result.messageId ?? null,
      });

      return this.notificationsRepository.updateNotificationStatus(notificationId, {
        status: 'sent',
        deliveredAt: new Date(),
      });
    } catch (error) {
      await this.notificationsRepository.createDeliveryAttempt({
        notificationId,
        attemptNumber,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Notification delivery failed',
      });

      return this.notificationsRepository.updateNotificationStatus(notificationId, {
        status: 'failed',
      });
    }
  }

  private async recordSkippedNotification(payload: EnqueueNotificationInput, skipReason: string) {
    const notification = await this.notificationsRepository.createNotification({
      ...payload,
      status: 'skipped',
      scheduledFor: payload.scheduledFor ?? null,
    });

    await this.notificationsRepository.createDeliveryAttempt({
      notificationId: notification.id,
      attemptNumber: notification.attempts.length + 1,
      status: 'skipped',
      errorMessage: skipReason,
    });

    return this.notificationsRepository.findNotificationById(notification.id);
  }

  private getSkipReason(payload: {
    user: Awaited<ReturnType<UsersService['findById']>>;
    preferences: Awaited<ReturnType<NotificationsRepository['getOrCreatePreferences']>>;
    category: NotificationCategory;
    channel: NotificationChannel;
  }) {
    if (payload.category === 'auth_otp') {
      if (payload.channel !== 'email') {
        return 'Auth OTP delivery must use email channel';
      }

      if (!payload.user?.email) {
        return 'No email address is available for auth delivery';
      }

      return null;
    }

    if (payload.channel === 'email' && !payload.preferences.emailEnabled) {
      return 'Email notifications are disabled for this user';
    }

    const categoryEnabledMap: Record<NotificationCategory, boolean> = {
      booking_reminder: payload.preferences.bookingRemindersEnabled,
      insurance_update: payload.preferences.insuranceUpdatesEnabled,
      back_job_update: payload.preferences.serviceFollowUpEnabled,
      invoice_aging: payload.preferences.invoiceRemindersEnabled,
      service_follow_up: payload.preferences.serviceFollowUpEnabled,
      auth_otp: true,
    };

    if (!categoryEnabledMap[payload.category]) {
      return `Notification preferences are disabled for category ${payload.category}`;
    }

    return null;
  }

  private async assertCanAccessUserNotifications(userId: string, actor: NotificationActor) {
    if (!roleAccess.includes(actor.role as (typeof roleAccess)[number])) {
      throw new ForbiddenException('Only customers, service advisers, or super admins can access notifications');
    }

    const [targetUser, actorUser] = await Promise.all([
      this.assertTargetUser(userId),
      this.usersService.findById(actor.userId),
    ]);

    if (!actorUser || !actorUser.isActive) {
      throw new NotFoundException('Notification actor not found');
    }

    if (actor.role === 'customer' && actor.userId !== targetUser.id) {
      throw new ForbiddenException('Customers can only access their own notifications');
    }

    if (actor.role !== 'customer' && !['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can access this notification resource');
    }

    return targetUser;
  }

  private async assertTargetUser(userId: string, allowInactive = false) {
    const user = await this.usersService.findById(userId);
    if (!user || (!allowInactive && !user.isActive)) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
