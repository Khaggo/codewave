import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const notificationChannelEnum = pgEnum('notification_channel', ['email']);

export const notificationCategoryEnum = pgEnum('notification_category', [
  'booking_reminder',
  'booking_payment',
  'insurance_update',
  'back_job_update',
  'invoice_aging',
  'invoice_document',
  'qa_review',
  'service_follow_up',
  'auth_otp',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
  'skipped',
  'cancelled',
]);

export const notificationSourceTypeEnum = pgEnum('notification_source_type', [
  'booking',
  'booking_payment',
  'insurance_inquiry',
  'back_job',
  'invoice_payment',
  'invoice_document',
  'job_order',
  'service_follow_up',
  'auth',
]);

export const reminderRuleStatusEnum = pgEnum('reminder_rule_status', ['scheduled', 'cancelled', 'processed']);

export const notificationAttemptStatusEnum = pgEnum('notification_attempt_status', [
  'sent',
  'failed',
  'skipped',
]);

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  bookingRemindersEnabled: boolean('booking_reminders_enabled').notNull().default(true),
  insuranceUpdatesEnabled: boolean('insurance_updates_enabled').notNull().default(true),
  invoiceRemindersEnabled: boolean('invoice_reminders_enabled').notNull().default(true),
  serviceFollowUpEnabled: boolean('service_follow_up_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: notificationCategoryEnum('category').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    sourceType: notificationSourceTypeEnum('source_type').notNull(),
    sourceId: varchar('source_id', { length: 120 }).notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    message: text('message').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    dedupeKey: varchar('dedupe_key', { length: 255 }).notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    notificationDedupeUnique: uniqueIndex('notifications_dedupe_key_idx').on(table.dedupeKey),
  }),
);

export const reminderRules = pgTable(
  'reminder_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reminderType: notificationCategoryEnum('reminder_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    sourceType: notificationSourceTypeEnum('source_type').notNull(),
    sourceId: varchar('source_id', { length: 120 }).notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    status: reminderRuleStatusEnum('status').notNull().default('scheduled'),
    dedupeKey: varchar('dedupe_key', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    reminderRuleDedupeUnique: uniqueIndex('reminder_rules_dedupe_key_idx').on(table.dedupeKey),
  }),
);

export const notificationDeliveryAttempts = pgTable('notification_delivery_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  notificationId: uuid('notification_id')
    .notNull()
    .references(() => notifications.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull(),
  status: notificationAttemptStatusEnum('status').notNull(),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  errorMessage: text('error_message'),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  attempts: many(notificationDeliveryAttempts),
}));

export const reminderRulesRelations = relations(reminderRules, ({ one }) => ({
  user: one(users, {
    fields: [reminderRules.userId],
    references: [users.id],
  }),
}));

export const notificationDeliveryAttemptsRelations = relations(notificationDeliveryAttempts, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveryAttempts.notificationId],
    references: [notifications.id],
  }),
}));
