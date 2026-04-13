import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { bookings } from '@main-modules/bookings/schemas/bookings.schema';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';

export const inspectionTypeEnum = pgEnum('inspection_type', [
  'intake',
  'pre_repair',
  'completion',
  'return',
]);

export const inspectionStatusEnum = pgEnum('inspection_status', [
  'pending',
  'completed',
  'needs_followup',
  'void',
]);

export const inspectionFindingSeverityEnum = pgEnum('inspection_finding_severity', [
  'info',
  'low',
  'medium',
  'high',
]);

export const vehicleInspections = pgTable('vehicle_inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  inspectionType: inspectionTypeEnum('inspection_type').notNull(),
  status: inspectionStatusEnum('status').notNull().default('pending'),
  inspectorUserId: uuid('inspector_user_id'),
  notes: text('notes'),
  attachmentRefs: text('attachment_refs').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inspectionFindings = pgTable('inspection_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  inspectionId: uuid('inspection_id')
    .notNull()
    .references(() => vehicleInspections.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 120 }).notNull(),
  label: varchar('label', { length: 160 }).notNull(),
  severity: inspectionFindingSeverityEnum('severity').notNull().default('info'),
  notes: text('notes'),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleInspectionsRelations = relations(vehicleInspections, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleInspections.vehicleId],
    references: [vehicles.id],
  }),
  booking: one(bookings, {
    fields: [vehicleInspections.bookingId],
    references: [bookings.id],
  }),
  findings: many(inspectionFindings),
}));

export const inspectionFindingsRelations = relations(inspectionFindings, ({ one }) => ({
  inspection: one(vehicleInspections, {
    fields: [inspectionFindings.inspectionId],
    references: [vehicleInspections.id],
  }),
}));
