import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plateNumber: varchar('plate_number', { length: 20 }).notNull().unique(),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  year: integer('year').notNull(),
  color: varchar('color', { length: 50 }),
  vin: varchar('vin', { length: 64 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
}));
