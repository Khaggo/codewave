import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

import { insuranceDocumentTypeEnum, insuranceInquiries } from './insurance.schema';

export const insuranceActivities = pgTable('insurance_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  inquiryId: uuid('inquiry_id')
    .notNull()
    .references(() => insuranceInquiries.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 80 }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  documentType: insuranceDocumentTypeEnum('document_type'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insuranceActivitiesRelations = relations(insuranceActivities, ({ one }) => ({
  inquiry: one(insuranceInquiries, {
    fields: [insuranceActivities.inquiryId],
    references: [insuranceInquiries.id],
  }),
  actorUser: one(users, {
    fields: [insuranceActivities.actorUserId],
    references: [users.id],
  }),
}));
