import { relations, sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const technicianProfiles = pgTable('technician_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  phone: varchar('phone', { length: 32 }),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  migratedFromUserId: uuid('migrated_from_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const technicianProfilesRelations = relations(technicianProfiles, ({ one }) => ({
  migratedFromUser: one(users, {
    fields: [technicianProfiles.migratedFromUserId],
    references: [users.id],
  }),
}));
