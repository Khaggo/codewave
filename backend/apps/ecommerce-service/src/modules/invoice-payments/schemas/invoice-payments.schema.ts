import { relations } from 'drizzle-orm';
import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const invoiceStatusValues = [
  'pending_payment',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const;

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().unique(),
  customerUserId: uuid('customer_user_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 32 }).notNull().unique(),
  status: varchar('status', { length: 32 }).$type<(typeof invoiceStatusValues)[number]>().notNull(),
  currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
  totalCents: integer('total_cents').notNull().default(0),
  amountPaidCents: integer('amount_paid_cents').notNull().default(0),
  amountDueCents: integer('amount_due_cents').notNull().default(0),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoicePaymentEntries = pgTable('invoice_payment_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ many }) => ({
  payments: many(payments),
  entries: many(invoicePaymentEntries),
}));
