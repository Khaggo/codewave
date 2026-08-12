import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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

export const vehicleInspections = pgTable(
  'vehicle_inspections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inspectionReference: varchar('inspection_reference', { length: 26 })
      .notNull()
      .default(
        sql`('INSP-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('vehicle_inspections_reference_seq')::text, 6, '0'))`,
      ),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    inspectionType: inspectionTypeEnum('inspection_type').notNull(),
    status: inspectionStatusEnum('status').notNull().default('pending'),
    inspectorUserId: uuid('inspector_user_id'),
    notes: text('notes'),
    attachmentRefs: text('attachment_refs').array().notNull().default([]),
    intakeDataVersion: integer('intake_data_version'),
    intakeData: jsonb('intake_data').$type<Record<string, unknown> | null>(),
    version: integer('version').notNull().default(1),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inspectionReferenceUnique: uniqueIndex('vehicle_inspections_reference_idx').on(
      table.inspectionReference,
    ),
    vehicleHistoryIndex: index('vehicle_inspections_vehicle_history_idx').on(
      table.vehicleId,
      table.createdAt,
      table.id,
    ),
  }),
);

export const inspectionEvidence = pgTable(
  'inspection_evidence',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inspectionId: uuid('inspection_id')
      .notNull()
      .references(() => vehicleInspections.id, { onDelete: 'cascade' }),
    slot: varchar('slot', { length: 40 }).notNull().default('general'),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 80 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    storageKey: text('storage_key').notNull(),
    createdByUserId: uuid('created_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    storageKeyUnique: uniqueIndex('inspection_evidence_storage_key_idx').on(table.storageKey),
    inspectionCreatedIndex: index('inspection_evidence_inspection_created_idx').on(
      table.inspectionId,
      table.createdAt,
    ),
  }),
);

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
  evidence: many(inspectionEvidence),
}));

export const inspectionFindingsRelations = relations(inspectionFindings, ({ one }) => ({
  inspection: one(vehicleInspections, {
    fields: [inspectionFindings.inspectionId],
    references: [vehicleInspections.id],
  }),
}));

export const inspectionEvidenceRelations = relations(inspectionEvidence, ({ one }) => ({
  inspection: one(vehicleInspections, {
    fields: [inspectionEvidence.inspectionId],
    references: [vehicleInspections.id],
  }),
}));
