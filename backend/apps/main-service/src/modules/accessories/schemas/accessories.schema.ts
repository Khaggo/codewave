import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
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

export const accessoryPublicationStatusEnum = pgEnum('accessory_publication_status', [
  'draft',
  'active',
  'archived',
]);
export const accessoryFitmentStatusEnum = pgEnum('accessory_fitment_status', [
  'universal',
  'compatible',
  'incompatible',
  'unverified',
]);
export const accessoryReservationStatusEnum = pgEnum('accessory_reservation_status', [
  'active',
  'consumed',
  'released',
  'expired',
]);
export const accessoryPaymentMethodEnum = pgEnum('accessory_payment_method', [
  'paymongo',
  'pay_at_shop',
]);
export const accessoryOrderStatusEnum = pgEnum('accessory_order_status', [
  'pending_payment',
  'reserved',
  'paid',
  'preparing',
  'ready_for_pickup',
  'collected',
  'cancelled',
  'expired',
  'payment_exception',
  'refund_pending',
  'refunded',
]);
export const accessoryPaymentStatusEnum = pgEnum('accessory_payment_status', [
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refund_pending',
  'refunded',
  'exception',
]);
export const accessoryRefundStatusEnum = pgEnum('accessory_refund_status', [
  'requested',
  'processing',
  'completed',
  'failed',
  'rejected',
]);
export const accessoryInventoryMovementTypeEnum = pgEnum('accessory_inventory_movement_type', [
  'stock_in',
  'adjustment',
  'reservation',
  'reservation_release',
  'sale',
  'refund_return',
]);
export const accessoryOutboxStatusEnum = pgEnum('accessory_outbox_status', [
  'pending',
  'processing',
  'sent',
  'failed',
]);

export type AccessoryVehicleSnapshot = {
  vehicleId: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  plateNumber: string | null;
};

export type AccessoryContactSnapshot = {
  name: string;
  phone: string;
  email: string;
};

export type AccessoryFitmentSnapshot = {
  status: (typeof accessoryFitmentStatusEnum.enumValues)[number];
  acknowledgedUnverified: boolean;
  ruleId: string | null;
};

export const accessoryCategories = pgTable(
  'accessory_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    displayOrder: integer('display_order').notNull().default(0),
    status: accessoryPublicationStatusEnum('status').notNull().default('draft'),
    version: integer('version').notNull().default(0),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('accessory_categories_slug_idx').on(table.slug),
    statusOrderIndex: index('accessory_categories_status_order_idx').on(
      table.status,
      table.displayOrder,
    ),
  }),
);

export const accessoryProducts = pgTable(
  'accessory_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => accessoryCategories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 180 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    status: accessoryPublicationStatusEnum('status').notNull().default('draft'),
    isLighting: boolean('is_lighting').notNull().default(false),
    compatibilityReviewedAt: timestamp('compatibility_reviewed_at', { withTimezone: true }),
    compatibilityReviewedByUserId: uuid('compatibility_reviewed_by_user_id').references(
      () => users.id,
      { onDelete: 'set null' },
    ),
    complianceReviewedAt: timestamp('compliance_reviewed_at', { withTimezone: true }),
    complianceReviewedByUserId: uuid('compliance_reviewed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    version: integer('version').notNull().default(0),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('accessory_products_slug_idx').on(table.slug),
    categoryStatusIndex: index('accessory_products_category_status_idx').on(
      table.categoryId,
      table.status,
    ),
    createdIndex: index('accessory_products_created_idx').on(table.createdAt, table.id),
  }),
);

export const accessoryVariants = pgTable(
  'accessory_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => accessoryProducts.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    priceCents: integer('price_cents').notNull(),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    skuUnique: uniqueIndex('accessory_variants_sku_idx').on(table.sku),
    productIndex: index('accessory_variants_product_idx').on(table.productId, table.isActive),
    nonNegativePrice: check('accessory_variants_price_nonnegative', sql`${table.priceCents} >= 0`),
  }),
);

export const accessoryProductMedia = pgTable(
  'accessory_product_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => accessoryProducts.id, { onDelete: 'cascade' }),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    publicUrl: text('public_url').notNull(),
    mimeType: varchar('mime_type', { length: 120 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    altText: varchar('alt_text', { length: 240 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productOrderUnique: uniqueIndex('accessory_product_media_order_idx').on(
      table.productId,
      table.displayOrder,
    ),
    storageKeyUnique: uniqueIndex('accessory_product_media_storage_key_idx').on(table.storageKey),
  }),
);

export const accessoryFitmentRules = pgTable(
  'accessory_fitment_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => accessoryVariants.id, { onDelete: 'cascade' }),
    status: accessoryFitmentStatusEnum('status').notNull(),
    make: varchar('make', { length: 120 }),
    model: varchar('model', { length: 120 }),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
    note: text('note'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    variantIndex: index('accessory_fitment_rules_variant_idx').on(table.variantId, table.status),
  }),
);

export const accessoryCatalogAudits = pgTable('accessory_catalog_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 60 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 80 }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessoryCarts = pgTable(
  'accessory_carts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    selectedVehicleId: uuid('selected_vehicle_id').references(() => vehicles.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeUserUnique: uniqueIndex('accessory_carts_active_user_idx')
      .on(table.userId)
      .where(sql`${table.isActive} = true`),
  }),
);

export const accessoryCartItems = pgTable(
  'accessory_cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => accessoryCarts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => accessoryVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cartVariantUnique: uniqueIndex('accessory_cart_items_cart_variant_idx').on(
      table.cartId,
      table.variantId,
    ),
    positiveQuantity: check('accessory_cart_items_quantity_positive', sql`${table.quantity} > 0`),
  }),
);

export const accessoryOrders = pgTable(
  'accessory_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderReference: varchar('order_reference', { length: 40 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    selectedVehicleId: uuid('selected_vehicle_id').references(() => vehicles.id, {
      onDelete: 'set null',
    }),
    status: accessoryOrderStatusEnum('status').notNull(),
    paymentMethod: accessoryPaymentMethodEnum('payment_method').notNull(),
    paymentStatus: accessoryPaymentStatusEnum('payment_status').notNull().default('pending'),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    subtotalCents: integer('subtotal_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    contactSnapshot: jsonb('contact_snapshot').$type<AccessoryContactSnapshot>().notNull(),
    vehicleSnapshot: jsonb('vehicle_snapshot').$type<AccessoryVehicleSnapshot | null>(),
    reservationExpiresAt: timestamp('reservation_expires_at', { withTimezone: true }),
    assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
    pickupCodeHash: varchar('pickup_code_hash', { length: 64 }),
    pickupCodeAttempts: integer('pickup_code_attempts').notNull().default(0),
    pickupCodeLockedUntil: timestamp('pickup_code_locked_until', { withTimezone: true }),
    version: integer('version').notNull().default(0),
    preparedAt: timestamp('prepared_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    referenceUnique: uniqueIndex('accessory_orders_reference_idx').on(table.orderReference),
    ownerCreatedIndex: index('accessory_orders_owner_created_idx').on(
      table.userId,
      table.createdAt,
      table.id,
    ),
    statusCreatedIndex: index('accessory_orders_status_created_idx').on(
      table.status,
      table.createdAt,
      table.id,
    ),
    nonNegativeTotals: check(
      'accessory_orders_totals_nonnegative',
      sql`${table.subtotalCents} >= 0 AND ${table.totalCents} >= 0`,
    ),
  }),
);

export const accessoryOrderItems = pgTable('accessory_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => accessoryOrders.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => accessoryVariants.id, { onDelete: 'set null' }),
  skuSnapshot: varchar('sku_snapshot', { length: 100 }).notNull(),
  productNameSnapshot: varchar('product_name_snapshot', { length: 200 }).notNull(),
  variantNameSnapshot: varchar('variant_name_snapshot', { length: 160 }).notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  lineTotalCents: integer('line_total_cents').notNull(),
  fitmentSnapshot: jsonb('fitment_snapshot').$type<AccessoryFitmentSnapshot>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessoryInventoryBalances = pgTable('accessory_inventory_balances', {
  variantId: uuid('variant_id')
    .primaryKey()
    .references(() => accessoryVariants.id, { onDelete: 'cascade' }),
  onHandQuantity: integer('on_hand_quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nonNegativeStock: check(
    'accessory_inventory_balances_nonnegative',
    sql`${table.onHandQuantity} >= 0 AND ${table.reservedQuantity} >= 0 AND ${table.reservedQuantity} <= ${table.onHandQuantity}`,
  ),
}));

export const accessoryInventoryReservations = pgTable(
  'accessory_inventory_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => accessoryOrders.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => accessoryVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    status: accessoryReservationStatusEnum('status').notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderVariantUnique: uniqueIndex('accessory_reservations_order_variant_idx').on(
      table.orderId,
      table.variantId,
    ),
    expiryIndex: index('accessory_reservations_expiry_idx').on(table.status, table.expiresAt),
  }),
);

export const accessoryInventoryMovements = pgTable('accessory_inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => accessoryVariants.id, { onDelete: 'restrict' }),
  movementType: accessoryInventoryMovementTypeEnum('movement_type').notNull(),
  quantityDelta: integer('quantity_delta').notNull(),
  resultingOnHand: integer('resulting_on_hand').notNull(),
  resultingReserved: integer('resulting_reserved').notNull(),
  sourceType: varchar('source_type', { length: 80 }).notNull(),
  sourceId: varchar('source_id', { length: 160 }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessoryPaymentAttempts = pgTable(
  'accessory_payment_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => accessoryOrders.id, { onDelete: 'cascade' }),
    status: accessoryPaymentStatusEnum('status').notNull().default('pending'),
    amountCents: integer('amount_cents').notNull(),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    providerCheckoutId: varchar('provider_checkout_id', { length: 255 }),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    checkoutUrl: text('checkout_url'),
    failureReason: text('failure_reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ orderIndex: index('accessory_payment_attempts_order_idx').on(table.orderId, table.createdAt) }),
);

export const accessoryPaymentEvents = pgTable('accessory_payment_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerEventId: varchar('provider_event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 160 }).notNull(),
  orderId: uuid('order_id').references(() => accessoryOrders.id, { onDelete: 'set null' }),
  livemode: boolean('livemode').notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessoryRefunds = pgTable(
  'accessory_refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => accessoryOrders.id, { onDelete: 'cascade' }),
    status: accessoryRefundStatusEnum('status').notNull().default('requested'),
    amountCents: integer('amount_cents').notNull(),
    currencyCode: varchar('currency_code', { length: 8 }).notNull().default('PHP'),
    reason: text('reason').notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    providerRefundId: varchar('provider_refund_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    oneActiveRefund: uniqueIndex('accessory_refunds_active_order_idx')
      .on(table.orderId)
      .where(sql`${table.status} IN ('requested', 'processing')`),
  }),
);

export const accessoryFulfillmentHistory = pgTable('accessory_fulfillment_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => accessoryOrders.id, { onDelete: 'cascade' }),
  previousStatus: accessoryOrderStatusEnum('previous_status'),
  nextStatus: accessoryOrderStatusEnum('next_status').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessoryOutbox = pgTable(
  'accessory_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: varchar('event_type', { length: 160 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 80 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: accessoryOutboxStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ pendingIndex: index('accessory_outbox_pending_idx').on(table.status, table.availableAt) }),
);

export const accessoryIdempotencyRecords = pgTable(
  'accessory_idempotency_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'cascade' }),
    scope: varchar('scope', { length: 100 }).notNull(),
    key: varchar('key', { length: 200 }).notNull(),
    payloadFingerprint: varchar('payload_fingerprint', { length: 64 }).notNull(),
    resourceType: varchar('resource_type', { length: 80 }),
    resourceId: uuid('resource_id'),
    responseSnapshot: jsonb('response_snapshot').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorScopeKeyUnique: uniqueIndex('accessory_idempotency_actor_scope_key_idx').on(
      table.actorUserId,
      table.scope,
      table.key,
    ),
  }),
);
