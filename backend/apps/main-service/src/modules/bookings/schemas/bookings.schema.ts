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
  'pending_payment',
  'confirmed',
  'in_service',
  'declined',
  'rescheduled',
  'completed',
  'cancelled',
]);

export const bookingReservationPaymentProviderEnum = pgEnum('booking_reservation_payment_provider', [
  'paymongo',
  'manual_counter',
]);

export const bookingReservationPaymentStatusEnum = pgEnum('booking_reservation_payment_status', [
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded',
]);

export const bookingReservationRefundStatusEnum = pgEnum('booking_reservation_refund_status', [
  'not_required',
  'pending_review',
  'processing',
  'completed',
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
  status: bookingStatusEnum('status').notNull().default('pending_payment'),
  notes: text('notes'),
  qrCodeToken: varchar('qr_code_token', { length: 120 }),
  qrCodeIssuedAt: timestamp('qr_code_issued_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookingPaymentPolicies = pgTable('booking_payment_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  reservationFeeAmountCents: integer('reservation_fee_amount_cents').notNull().default(50000),
  currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
  onlineExpiryWindowMinutes: integer('online_expiry_window_minutes').notNull().default(30),
  counterExpiryWindowMinutes: integer('counter_expiry_window_minutes').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bookingReservationPayments = pgTable(
  'booking_reservation_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    provider: bookingReservationPaymentProviderEnum('provider').notNull().default('paymongo'),
    status: bookingReservationPaymentStatusEnum('status').notNull().default('pending'),
    refundStatus: bookingReservationRefundStatusEnum('refund_status').notNull().default('not_required'),
    amountCents: integer('amount_cents').notNull(),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    providerCheckoutUrl: text('provider_checkout_url'),
    referenceNumber: varchar('reference_number', { length: 120 }),
    failureReason: text('failure_reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    auditMetadata: text('audit_metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bookingReservationPaymentUnique: uniqueIndex('booking_reservation_payments_booking_id_idx').on(table.bookingId),
  }),
);

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
  reservationPayment: one(bookingReservationPayments, {
    fields: [bookings.id],
    references: [bookingReservationPayments.bookingId],
  }),
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

export const bookingPaymentPoliciesRelations = relations(bookingPaymentPolicies, () => ({}));

export const bookingReservationPaymentsRelations = relations(bookingReservationPayments, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingReservationPayments.bookingId],
    references: [bookings.id],
  }),
  confirmedByUser: one(users, {
    fields: [bookingReservationPayments.confirmedByUserId],
    references: [users.id],
  }),
}));
