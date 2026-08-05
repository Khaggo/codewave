import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicReference: varchar('public_reference', { length: 24 })
      .notNull()
      .default(
        sql`('VEH-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('vehicles_public_reference_seq')::text, 6, '0'))`,
      ),
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
  },
  (table) => ({
    publicReferenceUnique: uniqueIndex('vehicles_public_reference_idx').on(table.publicReference),
    ownerGaragePageIndex: index('vehicles_user_created_id_idx').on(
      table.userId,
      table.createdAt,
      table.id,
    ),
  }),
);

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
}));
