import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { vehicleInspections } from '@main-modules/inspections/schemas/inspections.schema';
import { jobOrders } from '@main-modules/job-orders/schemas/job-orders.schema';
import { users } from '@main-modules/users/schemas/users.schema';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';
import { bookings } from '@main-modules/bookings/schemas/bookings.schema';

export const backJobStatusEnum = pgEnum('back_job_status', [
  'reported',
  'inspected',
  'approved_for_rework',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
]);

export const backJobFindingSeverityEnum = pgEnum('back_job_finding_severity', [
  'info',
  'low',
  'medium',
  'high',
]);

export const backJobs = pgTable('back_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerUserId: uuid('customer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'restrict' }),
  originalBookingId: uuid('original_booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  originalJobOrderId: uuid('original_job_order_id')
    .notNull()
    .references(() => jobOrders.id, { onDelete: 'restrict' }),
  returnInspectionId: uuid('return_inspection_id').references(() => vehicleInspections.id, {
    onDelete: 'set null',
  }),
  reworkJobOrderId: uuid('rework_job_order_id').references(() => jobOrders.id, { onDelete: 'set null' }),
  complaint: text('complaint').notNull(),
  status: backJobStatusEnum('status').notNull().default('reported'),
  reviewNotes: text('review_notes'),
  resolutionNotes: text('resolution_notes'),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const backJobFindings = pgTable('back_job_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  backJobId: uuid('back_job_id')
    .notNull()
    .references(() => backJobs.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 120 }).notNull(),
  label: varchar('label', { length: 160 }).notNull(),
  severity: backJobFindingSeverityEnum('severity').notNull().default('info'),
  notes: text('notes'),
  isValidated: boolean('is_validated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const backJobsRelations = relations(backJobs, ({ one, many }) => ({
  customer: one(users, {
    fields: [backJobs.customerUserId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [backJobs.vehicleId],
    references: [vehicles.id],
  }),
  originalBooking: one(bookings, {
    fields: [backJobs.originalBookingId],
    references: [bookings.id],
  }),
  originalJobOrder: one(jobOrders, {
    fields: [backJobs.originalJobOrderId],
    references: [jobOrders.id],
    relationName: 'back_job_original_job_order',
  }),
  returnInspection: one(vehicleInspections, {
    fields: [backJobs.returnInspectionId],
    references: [vehicleInspections.id],
  }),
  reworkJobOrder: one(jobOrders, {
    fields: [backJobs.reworkJobOrderId],
    references: [jobOrders.id],
    relationName: 'back_job_rework_job_order',
  }),
  createdBy: one(users, {
    fields: [backJobs.createdByUserId],
    references: [users.id],
  }),
  findings: many(backJobFindings),
}));

export const backJobFindingsRelations = relations(backJobFindings, ({ one }) => ({
  backJob: one(backJobs, {
    fields: [backJobFindings.backJobId],
    references: [backJobs.id],
  }),
}));
