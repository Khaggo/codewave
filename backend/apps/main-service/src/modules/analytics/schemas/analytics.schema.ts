import { relations, sql } from 'drizzle-orm';
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const analyticsSnapshotTypeEnum = pgEnum('analytics_snapshot_type', [
  'dashboard',
  'operations',
  'back_jobs',
  'loyalty',
  'invoice_aging',
  'audit_trail',
]);

export const analyticsRefreshJobStatusEnum = pgEnum('analytics_refresh_job_status', [
  'processing',
  'completed',
  'failed',
]);

export const analyticsRefreshTriggerSourceEnum = pgEnum('analytics_refresh_trigger_source', [
  'bootstrap_read',
  'manual_refresh',
  'integration_refresh',
]);

export type AnalyticsSnapshotPayload = Record<string, unknown>;
export type AnalyticsSourceCounts = Record<string, number>;

export const analyticsRefreshJobs = pgTable('analytics_refresh_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotTypes: jsonb('snapshot_types')
    .$type<(typeof analyticsSnapshotTypeEnum.enumValues)[number][]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  triggerSource: analyticsRefreshTriggerSourceEnum('trigger_source').notNull(),
  requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: analyticsRefreshJobStatusEnum('status').notNull().default('processing'),
  sourceCounts: jsonb('source_counts')
    .$type<AnalyticsSourceCounts>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsSnapshots = pgTable(
  'analytics_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    snapshotType: analyticsSnapshotTypeEnum('snapshot_type').notNull(),
    version: varchar('version', { length: 32 }).notNull().default('v1'),
    payload: jsonb('payload').$type<AnalyticsSnapshotPayload>().notNull(),
    sourceCounts: jsonb('source_counts')
      .$type<AnalyticsSourceCounts>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    refreshJobId: uuid('refresh_job_id').references(() => analyticsRefreshJobs.id, {
      onDelete: 'set null',
    }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    analyticsSnapshotTypeUnique: uniqueIndex('analytics_snapshots_snapshot_type_idx').on(
      table.snapshotType,
    ),
  }),
);

export const analyticsRefreshJobsRelations = relations(analyticsRefreshJobs, ({ one, many }) => ({
  requestedByUser: one(users, {
    fields: [analyticsRefreshJobs.requestedByUserId],
    references: [users.id],
  }),
  snapshots: many(analyticsSnapshots),
}));

export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({ one }) => ({
  refreshJob: one(analyticsRefreshJobs, {
    fields: [analyticsSnapshots.refreshJobId],
    references: [analyticsRefreshJobs.id],
  }),
}));
