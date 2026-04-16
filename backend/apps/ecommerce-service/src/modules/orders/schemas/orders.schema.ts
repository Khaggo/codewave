import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const orderStatusValues = [
  'invoice_pending',
  'awaiting_fulfillment',
  'fulfilled',
  'cancelled',
] as const;

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 32 }).notNull().unique(),
  customerUserId: uuid('customer_user_id').notNull(),
  checkoutMode: varchar('checkout_mode', { length: 24 }).notNull().default('invoice'),
  status: varchar('status', { length: 32 }).$type<(typeof orderStatusValues)[number]>().notNull(),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  notes: text('notes'),
  invoiceId: uuid('invoice_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  productName: varchar('product_name', { length: 160 }).notNull(),
  productSlug: varchar('product_slug', { length: 160 }).notNull(),
  sku: varchar('sku', { length: 80 }).notNull(),
  description: text('description'),
  quantity: integer('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  lineTotalCents: integer('line_total_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderAddresses = pgTable('order_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  addressType: varchar('address_type', { length: 24 }).notNull().default('billing'),
  recipientName: varchar('recipient_name', { length: 160 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 32 }),
  addressLine1: varchar('address_line_1', { length: 180 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 180 }),
  city: varchar('city', { length: 120 }).notNull(),
  province: varchar('province', { length: 120 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  previousStatus: varchar('previous_status', { length: 32 }).$type<(typeof orderStatusValues)[number] | null>(),
  nextStatus: varchar('next_status', { length: 32 }).$type<(typeof orderStatusValues)[number]>().notNull(),
  reason: text('reason'),
  transitionType: varchar('transition_type', { length: 24 })
    .$type<'checkout' | 'status_update' | 'cancel'>()
    .notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  addresses: many(orderAddresses),
  statusHistory: many(orderStatusHistory),
}));
