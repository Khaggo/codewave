import { relations } from 'drizzle-orm';
import {
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

export const insuranceInquiryTypeEnum = pgEnum('insurance_inquiry_type', ['ctpl', 'comprehensive']);

export const insuranceInquiryStatusEnum = pgEnum('insurance_inquiry_status', [
  'submitted',
  'under_review',
  'needs_documents',
  'approved_for_record',
  'rejected',
  'closed',
]);

export const insuranceDocumentTypeEnum = pgEnum('insurance_document_type', [
  'or_cr',
  'policy',
  'photo',
  'estimate',
  'other',
]);

export const insuranceInquiries = pgTable('insurance_inquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  inquiryType: insuranceInquiryTypeEnum('inquiry_type').notNull(),
  subject: varchar('subject', { length: 180 }).notNull(),
  description: text('description').notNull(),
  providerName: varchar('provider_name', { length: 180 }),
  policyNumber: varchar('policy_number', { length: 120 }),
  notes: text('notes'),
  status: insuranceInquiryStatusEnum('status').notNull().default('submitted'),
  reviewNotes: text('review_notes'),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insuranceDocuments = pgTable('insurance_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  inquiryId: uuid('inquiry_id')
    .notNull()
    .references(() => insuranceInquiries.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  documentType: insuranceDocumentTypeEnum('document_type').notNull(),
  notes: text('notes'),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insuranceRecords = pgTable(
  'insurance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => insuranceInquiries.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    inquiryType: insuranceInquiryTypeEnum('inquiry_type').notNull(),
    providerName: varchar('provider_name', { length: 180 }),
    policyNumber: varchar('policy_number', { length: 120 }),
    status: insuranceInquiryStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    insuranceRecordInquiryUnique: uniqueIndex('insurance_records_inquiry_id_idx').on(table.inquiryId),
  }),
);

export const insuranceInquiriesRelations = relations(insuranceInquiries, ({ one, many }) => ({
  user: one(users, {
    fields: [insuranceInquiries.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [insuranceInquiries.vehicleId],
    references: [vehicles.id],
  }),
  createdByUser: one(users, {
    fields: [insuranceInquiries.createdByUserId],
    references: [users.id],
    relationName: 'insuranceInquiryCreatedBy',
  }),
  reviewedByUser: one(users, {
    fields: [insuranceInquiries.reviewedByUserId],
    references: [users.id],
    relationName: 'insuranceInquiryReviewedBy',
  }),
  documents: many(insuranceDocuments),
}));

export const insuranceDocumentsRelations = relations(insuranceDocuments, ({ one }) => ({
  inquiry: one(insuranceInquiries, {
    fields: [insuranceDocuments.inquiryId],
    references: [insuranceInquiries.id],
  }),
  uploadedByUser: one(users, {
    fields: [insuranceDocuments.uploadedByUserId],
    references: [users.id],
  }),
}));

export const insuranceRecordsRelations = relations(insuranceRecords, ({ one }) => ({
  inquiry: one(insuranceInquiries, {
    fields: [insuranceRecords.inquiryId],
    references: [insuranceInquiries.id],
  }),
  user: one(users, {
    fields: [insuranceRecords.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [insuranceRecords.vehicleId],
    references: [vehicles.id],
  }),
}));
