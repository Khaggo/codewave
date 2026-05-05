import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
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

import { users } from '@main-modules/users/schemas/users.schema';
import { vehicles } from '@main-modules/vehicles/schemas/vehicles.schema';

export const jobOrderSourceTypeEnum = pgEnum('job_order_source_type', ['booking', 'back_job']);
export const jobOrderTypeEnum = pgEnum('job_order_type', ['normal', 'back_job']);

export const jobOrderStatusEnum = pgEnum('job_order_status', [
  'draft',
  'assigned',
  'in_progress',
  'ready_for_qa',
  'blocked',
  'finalized',
  'cancelled',
]);

export const jobOrderProgressEntryTypeEnum = pgEnum('job_order_progress_entry_type', [
  'note',
  'work_started',
  'work_completed',
  'issue_found',
]);

export const jobOrderInvoicePaymentStatusEnum = pgEnum('job_order_invoice_payment_status', [
  'pending_payment',
  'paid',
]);

export const jobOrderInvoicePaymentMethodEnum = pgEnum('job_order_invoice_payment_method', [
  'cash',
  'bank_transfer',
  'check',
  'other',
]);

export const jobOrderPhotoLinkTypeEnum = pgEnum('job_order_photo_link_type', [
  'job_order',
  'progress_entry',
  'work_item',
  'qa_review',
]);

export const jobOrders = pgTable('job_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceType: jobOrderSourceTypeEnum('source_type').notNull(),
  sourceId: uuid('source_id').notNull(),
  jobType: jobOrderTypeEnum('job_type').notNull().default('normal'),
  parentJobOrderId: uuid('parent_job_order_id'),
  customerUserId: uuid('customer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'restrict' }),
  serviceAdviserUserId: uuid('service_adviser_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  serviceAdviserCode: varchar('service_adviser_code', { length: 40 }).notNull(),
  status: jobOrderStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  parentJobOrderForeignKey: foreignKey({
    columns: [table.parentJobOrderId],
    foreignColumns: [table.id],
    name: 'job_orders_parent_job_order_id_fkey',
  }).onDelete('set null'),
}));

export const jobOrderItems = pgTable('job_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobOrderId: uuid('job_order_id')
    .notNull()
    .references(() => jobOrders.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  estimatedHours: integer('estimated_hours'),
  requiresPhotoEvidence: boolean('requires_photo_evidence').notNull().default(true),
  isCompleted: boolean('is_completed').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobOrderAssignments = pgTable(
  'job_order_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobOrderId: uuid('job_order_id')
      .notNull()
      .references(() => jobOrders.id, { onDelete: 'cascade' }),
    technicianUserId: uuid('technician_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    technicianAssignmentUnique: uniqueIndex('job_order_assignments_job_order_id_technician_user_id_idx').on(
      table.jobOrderId,
      table.technicianUserId,
    ),
  }),
);

export const jobOrderProgressLogs = pgTable('job_order_progress_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobOrderId: uuid('job_order_id')
    .notNull()
    .references(() => jobOrders.id, { onDelete: 'cascade' }),
  technicianUserId: uuid('technician_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  entryType: jobOrderProgressEntryTypeEnum('entry_type').notNull(),
  message: text('message').notNull(),
  completedItemIds: jsonb('completed_item_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  attachedPhotoIds: jsonb('attached_photo_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobOrderPhotos = pgTable('job_order_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobOrderId: uuid('job_order_id')
    .notNull()
    .references(() => jobOrders.id, { onDelete: 'cascade' }),
  takenByUserId: uuid('taken_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  linkedEntityType: jobOrderPhotoLinkTypeEnum('linked_entity_type').notNull().default('job_order'),
  linkedEntityId: uuid('linked_entity_id'),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull().default('image/jpeg'),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  caption: text('caption'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobOrderInvoiceRecords = pgTable(
  'job_order_invoice_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobOrderId: uuid('job_order_id')
      .notNull()
      .references(() => jobOrders.id, { onDelete: 'cascade' }),
    invoiceReference: varchar('invoice_reference', { length: 40 }).notNull(),
    sourceType: jobOrderSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    customerUserId: uuid('customer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    serviceAdviserUserId: uuid('service_adviser_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    serviceAdviserCode: varchar('service_adviser_code', { length: 40 }).notNull(),
    finalizedByUserId: uuid('finalized_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    paymentStatus: jobOrderInvoicePaymentStatusEnum('payment_status').notNull().default('pending_payment'),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    subtotalAmountCents: integer('subtotal_amount_cents').notNull().default(0),
    laborAmountCents: integer('labor_amount_cents').notNull().default(0),
    partsAmountCents: integer('parts_amount_cents').notNull().default(0),
    reservationFeeDeductionCents: integer('reservation_fee_deduction_cents').notNull().default(0),
    totalAmountCents: integer('total_amount_cents').notNull().default(0),
    amountPaidCents: integer('amount_paid_cents'),
    paymentMethod: jobOrderInvoicePaymentMethodEnum('payment_method'),
    paymentReference: varchar('payment_reference', { length: 120 }),
    officialReceiptReference: varchar('official_receipt_reference', { length: 40 }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    recordedByUserId: uuid('recorded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    summary: text('summary'),
    pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),
    pdfEmailSentAt: timestamp('pdf_email_sent_at', { withTimezone: true }),
    pdfEmailError: text('pdf_email_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    jobOrderInvoiceRecordUnique: uniqueIndex('job_order_invoice_records_job_order_id_idx').on(table.jobOrderId),
    invoiceReferenceUnique: uniqueIndex('job_order_invoice_records_invoice_reference_idx').on(table.invoiceReference),
  }),
);

export const jobOrdersRelations = relations(jobOrders, ({ one, many }) => ({
  customer: one(users, {
    fields: [jobOrders.customerUserId],
    references: [users.id],
  }),
  parentJobOrder: one(jobOrders, {
    fields: [jobOrders.parentJobOrderId],
    references: [jobOrders.id],
    relationName: 'job_order_parent_child',
  }),
  vehicle: one(vehicles, {
    fields: [jobOrders.vehicleId],
    references: [vehicles.id],
  }),
  serviceAdviser: one(users, {
    fields: [jobOrders.serviceAdviserUserId],
    references: [users.id],
  }),
  items: many(jobOrderItems),
  assignments: many(jobOrderAssignments),
  progressEntries: many(jobOrderProgressLogs),
  photos: many(jobOrderPhotos),
  reworkJobOrders: many(jobOrders, {
    relationName: 'job_order_parent_child',
  }),
  invoiceRecord: one(jobOrderInvoiceRecords, {
    fields: [jobOrders.id],
    references: [jobOrderInvoiceRecords.jobOrderId],
  }),
}));

export const jobOrderItemsRelations = relations(jobOrderItems, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderItems.jobOrderId],
    references: [jobOrders.id],
  }),
}));

export const jobOrderAssignmentsRelations = relations(jobOrderAssignments, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderAssignments.jobOrderId],
    references: [jobOrders.id],
  }),
  technician: one(users, {
    fields: [jobOrderAssignments.technicianUserId],
    references: [users.id],
  }),
}));

export const jobOrderProgressLogsRelations = relations(jobOrderProgressLogs, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderProgressLogs.jobOrderId],
    references: [jobOrders.id],
  }),
  technician: one(users, {
    fields: [jobOrderProgressLogs.technicianUserId],
    references: [users.id],
  }),
}));

export const jobOrderPhotosRelations = relations(jobOrderPhotos, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderPhotos.jobOrderId],
    references: [jobOrders.id],
  }),
  takenBy: one(users, {
    fields: [jobOrderPhotos.takenByUserId],
    references: [users.id],
  }),
}));

export const jobOrderInvoiceRecordsRelations = relations(jobOrderInvoiceRecords, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderInvoiceRecords.jobOrderId],
    references: [jobOrders.id],
  }),
  customer: one(users, {
    fields: [jobOrderInvoiceRecords.customerUserId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [jobOrderInvoiceRecords.vehicleId],
    references: [vehicles.id],
  }),
  serviceAdviser: one(users, {
    fields: [jobOrderInvoiceRecords.serviceAdviserUserId],
    references: [users.id],
  }),
  finalizedBy: one(users, {
    fields: [jobOrderInvoiceRecords.finalizedByUserId],
    references: [users.id],
  }),
  recordedBy: one(users, {
    fields: [jobOrderInvoiceRecords.recordedByUserId],
    references: [users.id],
  }),
}));
