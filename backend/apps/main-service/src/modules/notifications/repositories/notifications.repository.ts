import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';
import {
  notificationAttemptStatusEnum,
  notificationCategoryEnum,
  notificationChannelEnum,
  notificationDeliveryAttempts,
  notificationPreferences,
  notifications,
  notificationSourceTypeEnum,
  notificationStatusEnum,
  reminderRules,
  reminderRuleStatusEnum,
} from '../schemas/notifications.schema';

type NotificationCategory = (typeof notificationCategoryEnum.enumValues)[number];
type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];
type NotificationSourceType = (typeof notificationSourceTypeEnum.enumValues)[number];
type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
type NotificationAttemptStatus = (typeof notificationAttemptStatusEnum.enumValues)[number];
type ReminderRuleStatus = (typeof reminderRuleStatusEnum.enumValues)[number];

type CreateNotificationInput = {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  title: string;
  message: string;
  status: NotificationStatus;
  dedupeKey: string;
  scheduledFor?: Date | null;
  deliveredAt?: Date | null;
};

type CreateDeliveryAttemptInput = {
  notificationId: string;
  attemptNumber: number;
  status: NotificationAttemptStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

type UpdateNotificationStatusInput = {
  status: NotificationStatus;
  deliveredAt?: Date | null;
};

type CreateReminderRuleInput = {
  userId: string;
  reminderType: NotificationCategory;
  channel: NotificationChannel;
  sourceType: NotificationSourceType;
  sourceId: string;
  scheduledFor: Date;
  status?: ReminderRuleStatus;
  dedupeKey: string;
};

@Injectable()
export class NotificationsRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async findPreferencesByUserId(userId: string, db: AppDatabase = this.db) {
    return db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  async createDefaultPreferences(userId: string) {
    const [createdPreferences] = await this.db
      .insert(notificationPreferences)
      .values({
        userId,
      })
      .returning();

    return this.assertFound(createdPreferences, 'Notification preferences not found');
  }

  async getOrCreatePreferences(userId: string) {
    const existingPreferences = await this.findPreferencesByUserId(userId);
    if (existingPreferences) {
      return existingPreferences;
    }

    return this.createDefaultPreferences(userId);
  }

  async updatePreferences(userId: string, payload: UpdateNotificationPreferencesDto) {
    const existingPreferences = await this.getOrCreatePreferences(userId);

    const [updatedPreferences] = await this.db
      .update(notificationPreferences)
      .set({
        emailEnabled: payload.emailEnabled ?? existingPreferences.emailEnabled,
        smsEnabled: payload.smsEnabled ?? existingPreferences.smsEnabled,
        bookingRemindersEnabled:
          payload.bookingRemindersEnabled ?? existingPreferences.bookingRemindersEnabled,
        insuranceUpdatesEnabled:
          payload.insuranceUpdatesEnabled ?? existingPreferences.insuranceUpdatesEnabled,
        invoiceRemindersEnabled:
          payload.invoiceRemindersEnabled ?? existingPreferences.invoiceRemindersEnabled,
        serviceFollowUpEnabled:
          payload.serviceFollowUpEnabled ?? existingPreferences.serviceFollowUpEnabled,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.id, existingPreferences.id))
      .returning();

    return this.assertFound(updatedPreferences, 'Notification preferences not found');
  }

  async findNotificationById(id: string, db: AppDatabase = this.db) {
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, id),
      with: {
        attempts: {
          orderBy: desc(notificationDeliveryAttempts.attemptedAt),
        },
      },
    });

    return this.assertFound(notification, 'Notification not found');
  }

  async listNotificationsByUserId(userId: string) {
    return this.db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: desc(notifications.createdAt),
      with: {
        attempts: {
          orderBy: desc(notificationDeliveryAttempts.attemptedAt),
        },
      },
    });
  }

  async findNotificationByDedupeKey(dedupeKey: string) {
    const notification = await this.db.query.notifications.findFirst({
      where: eq(notifications.dedupeKey, dedupeKey),
      with: {
        attempts: {
          orderBy: desc(notificationDeliveryAttempts.attemptedAt),
        },
      },
    });

    return notification ?? null;
  }

  async createNotification(payload: CreateNotificationInput) {
    const [createdNotification] = await this.db
      .insert(notifications)
      .values({
        userId: payload.userId,
        category: payload.category,
        channel: payload.channel,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        title: payload.title,
        message: payload.message,
        status: payload.status,
        dedupeKey: payload.dedupeKey,
        scheduledFor: payload.scheduledFor ?? null,
        deliveredAt: payload.deliveredAt ?? null,
      })
      .returning();

    return this.findNotificationById(this.assertFound(createdNotification, 'Notification not found').id);
  }

  async createDeliveryAttempt(payload: CreateDeliveryAttemptInput) {
    const [createdAttempt] = await this.db
      .insert(notificationDeliveryAttempts)
      .values({
        notificationId: payload.notificationId,
        attemptNumber: payload.attemptNumber,
        status: payload.status,
        providerMessageId: payload.providerMessageId ?? null,
        errorMessage: payload.errorMessage ?? null,
      })
      .returning();

    return this.assertFound(createdAttempt, 'Notification delivery attempt not found');
  }

  async updateNotificationStatus(id: string, payload: UpdateNotificationStatusInput) {
    const [updatedNotification] = await this.db
      .update(notifications)
      .set({
        status: payload.status,
        deliveredAt: payload.deliveredAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    return this.findNotificationById(
      this.assertFound(updatedNotification, 'Notification not found').id,
    );
  }

  async findReminderRuleByDedupeKey(dedupeKey: string) {
    return (
      (await this.db.query.reminderRules.findFirst({
        where: eq(reminderRules.dedupeKey, dedupeKey),
      })) ?? null
    );
  }

  async createReminderRule(payload: CreateReminderRuleInput) {
    const [createdRule] = await this.db
      .insert(reminderRules)
      .values({
        userId: payload.userId,
        reminderType: payload.reminderType,
        channel: payload.channel,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        scheduledFor: payload.scheduledFor,
        status: payload.status ?? 'scheduled',
        dedupeKey: payload.dedupeKey,
      })
      .returning();

    return this.assertFound(createdRule, 'Reminder rule not found');
  }
}
