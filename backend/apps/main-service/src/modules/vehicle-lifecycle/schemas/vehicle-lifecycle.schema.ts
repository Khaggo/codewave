import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { vehicleInspections } from '@main-modules/inspections/schemas/inspections.schema';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';

export const vehicleTimelineSourceTypeEnum = pgEnum('vehicle_timeline_source_type', [
  'booking',
  'inspection',
  'manual',
]);

export const vehicleTimelineEventCategoryEnum = pgEnum('vehicle_timeline_event_category', [
  'administrative',
  'verified',
]);

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
