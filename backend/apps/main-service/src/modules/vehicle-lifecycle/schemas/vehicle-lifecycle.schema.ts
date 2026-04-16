import { relations, sql } from 'drizzle-orm';
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { vehicleInspections } from '@main-modules/inspections/schemas/inspections.schema';
import { users } from '@main-modules/users/schemas/users.schema';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';
import { AiWorkerJobMetadata } from '@shared/queue/ai-worker.types';

export const vehicleTimelineSourceTypeEnum = pgEnum('vehicle_timeline_source_type', [
  'booking',
  'inspection',
  'job_order',
  'quality_gate',
  'lifecycle_summary',
  'manual',
]);

export const vehicleTimelineEventCategoryEnum = pgEnum('vehicle_timeline_event_category', [
  'administrative',
  'verified',
]);

export const vehicleLifecycleSummaryStatusEnum = pgEnum('vehicle_lifecycle_summary_status', [
  'queued',
  'generating',
  'generation_failed',
  'pending_review',
  'approved',
  'rejected',
]);

export type VehicleLifecycleSummaryProvenance = {
  provider: string;
  model: string;
  promptVersion: string;
  evidenceRefs: string[];
  evidenceSummary: string;
};

export const vehicleTimelineEvents = pgTable('vehicle_timeline_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 120 }).notNull(),
  eventCategory: vehicleTimelineEventCategoryEnum('event_category').notNull(),
  sourceType: vehicleTimelineSourceTypeEnum('source_type').notNull(),
  sourceId: varchar('source_id', { length: 120 }).notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  verified: boolean('verified').notNull().default(false),
  inspectionId: uuid('inspection_id').references(() => vehicleInspections.id, { onDelete: 'set null' }),
  actorUserId: uuid('actor_user_id'),
  notes: text('notes'),
  dedupeKey: varchar('dedupe_key', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleLifecycleSummaries = pgTable('vehicle_lifecycle_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  requestedByUserId: uuid('requested_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  summaryText: text('summary_text').notNull(),
  status: vehicleLifecycleSummaryStatusEnum('status').notNull().default('pending_review'),
  customerVisible: boolean('customer_visible').notNull().default(false),
  customerVisibleAt: timestamp('customer_visible_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  generationJob: jsonb('generation_job').$type<AiWorkerJobMetadata | null>(),
  provenance: jsonb('provenance')
    .$type<VehicleLifecycleSummaryProvenance>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleTimelineEventsRelations = relations(vehicleTimelineEvents, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleTimelineEvents.vehicleId],
    references: [vehicles.id],
  }),
  inspection: one(vehicleInspections, {
    fields: [vehicleTimelineEvents.inspectionId],
    references: [vehicleInspections.id],
  }),
}));

export const vehicleLifecycleSummariesRelations = relations(vehicleLifecycleSummaries, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleLifecycleSummaries.vehicleId],
    references: [vehicles.id],
  }),
  requestedByUser: one(users, {
    fields: [vehicleLifecycleSummaries.requestedByUserId],
    references: [users.id],
    relationName: 'vehicle_lifecycle_summary_requested_by',
  }),
  reviewedByUser: one(users, {
    fields: [vehicleLifecycleSummaries.reviewedByUserId],
    references: [users.id],
    relationName: 'vehicle_lifecycle_summary_reviewed_by',
  }),
}));
