import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
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

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'declined',
  'rescheduled',
  'completed',
  'cancelled',
]);

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => serviceCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 120 }).notNull().unique(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const timeSlots = pgTable('time_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 120 }).notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  capacity: integer('capacity').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  timeSlotId: uuid('time_slot_id')
    .notNull()
    .references(() => timeSlots.id, { onDelete: 'restrict' }),
  scheduledDate: date('scheduled_date', { mode: 'string' }).notNull(),
  status: bookingStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookingServices = pgTable(
  'booking_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bookingServiceUnique: uniqueIndex('booking_services_booking_id_service_id_idx').on(
      table.bookingId,
      table.serviceId,
    ),
  }),
);

export const bookingStatusHistory = pgTable('booking_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  previousStatus: bookingStatusEnum('previous_status'),
  nextStatus: bookingStatusEnum('next_status').notNull(),
  reason: text('reason'),
  changedByUserId: uuid('changed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  bookingServices: many(bookingServices),
}));

export const timeSlotsRelations = relations(timeSlots, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id],
  }),
  timeSlot: one(timeSlots, {
    fields: [bookings.timeSlotId],
    references: [timeSlots.id],
  }),
  requestedServices: many(bookingServices),
  statusHistory: many(bookingStatusHistory),
}));

export const bookingServicesRelations = relations(bookingServices, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingServices.bookingId],
    references: [bookings.id],
  }),
  service: one(services, {
    fields: [bookingServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingStatusHistoryRelations = relations(bookingStatusHistory, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingStatusHistory.bookingId],
    references: [bookings.id],
  }),
  changedByUser: one(users, {
    fields: [bookingStatusHistory.changedByUserId],
    references: [users.id],
  }),
}));
