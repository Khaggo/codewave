import { relations, sql } from 'drizzle-orm';
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const loyaltyTransactionTypeEnum = pgEnum('loyalty_transaction_type', [
  'accrual',
  'redemption',
  'adjustment',
  'reversal',
]);

export const loyaltySourceTypeEnum = pgEnum('loyalty_source_type', [
  'service_invoice',
  'purchase_payment',
  'reward_redemption',
  'manual_adjustment',
  'service_reversal',
  'purchase_reversal',
]);

export const rewardTypeEnum = pgEnum('reward_type', ['service_voucher', 'discount_coupon']);

export const rewardStatusEnum = pgEnum('reward_status', ['active', 'inactive']);

export const rewardCatalogAuditActionEnum = pgEnum('reward_catalog_audit_action', [
  'created',
  'updated',
  'activated',
  'deactivated',
]);

export type LoyaltyTransactionMetadata = {
  triggerName?: string;
  sourceDomain?: string;
  reversalStrategy?: string;
  duplicateStrategy?: string;
  pointsInput?: Record<string, unknown>;
  rewardNameSnapshot?: string;
  redeemedByUserId?: string;
  note?: string | null;
};

export type RewardCatalogSnapshot = {
  name: string;
  description: string | null;
  rewardType: (typeof rewardTypeEnum.enumValues)[number];
  pointsCost: number;
  discountPercent: number | null;
  status: (typeof rewardStatusEnum.enumValues)[number];
};

export const loyaltyAccounts = pgTable('loyalty_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  pointsBalance: integer('points_balance').notNull().default(0),
  lifetimePointsEarned: integer('lifetime_points_earned').notNull().default(0),
  lifetimePointsRedeemed: integer('lifetime_points_redeemed').notNull().default(0),
  lastAccruedAt: timestamp('last_accrued_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rewards = pgTable('rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  rewardType: rewardTypeEnum('reward_type').notNull(),
  pointsCost: integer('points_cost').notNull(),
  discountPercent: integer('discount_percent'),
  status: rewardStatusEnum('status').notNull().default('active'),
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  loyaltyAccountId: uuid('loyalty_account_id')
    .notNull()
    .references(() => loyaltyAccounts.id, { onDelete: 'cascade' }),
  transactionType: loyaltyTransactionTypeEnum('transaction_type').notNull(),
  sourceType: loyaltySourceTypeEnum('source_type').notNull(),
  sourceReference: varchar('source_reference', { length: 200 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 220 }).unique(),
  policyKey: varchar('policy_key', { length: 120 }),
  pointsDelta: integer('points_delta').notNull(),
  resultingBalance: integer('resulting_balance').notNull(),
  metadata: jsonb('metadata')
    .$type<LoyaltyTransactionMetadata>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rewardRedemptions = pgTable('reward_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  loyaltyAccountId: uuid('loyalty_account_id')
    .notNull()
    .references(() => loyaltyAccounts.id, { onDelete: 'cascade' }),
  rewardId: uuid('reward_id')
    .notNull()
    .references(() => rewards.id, { onDelete: 'restrict' }),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => loyaltyTransactions.id, { onDelete: 'cascade' })
    .unique(),
  redeemedByUserId: uuid('redeemed_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  rewardNameSnapshot: varchar('reward_name_snapshot', { length: 160 }).notNull(),
  pointsCostSnapshot: integer('points_cost_snapshot').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rewardCatalogAudits = pgTable('reward_catalog_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  rewardId: uuid('reward_id')
    .notNull()
    .references(() => rewards.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  action: rewardCatalogAuditActionEnum('action').notNull(),
  reason: text('reason'),
  snapshot: jsonb('snapshot')
    .$type<RewardCatalogSnapshot>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [loyaltyAccounts.userId],
    references: [users.id],
  }),
  transactions: many(loyaltyTransactions),
  redemptions: many(rewardRedemptions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  account: one(loyaltyAccounts, {
    fields: [loyaltyTransactions.loyaltyAccountId],
    references: [loyaltyAccounts.id],
  }),
  redemption: one(rewardRedemptions, {
    fields: [loyaltyTransactions.id],
    references: [rewardRedemptions.transactionId],
  }),
}));

export const rewardsRelations = relations(rewards, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [rewards.createdByUserId],
    references: [users.id],
    relationName: 'reward_created_by',
  }),
  updatedByUser: one(users, {
    fields: [rewards.updatedByUserId],
    references: [users.id],
    relationName: 'reward_updated_by',
  }),
  audits: many(rewardCatalogAudits),
  redemptions: many(rewardRedemptions),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  account: one(loyaltyAccounts, {
    fields: [rewardRedemptions.loyaltyAccountId],
    references: [loyaltyAccounts.id],
  }),
  reward: one(rewards, {
    fields: [rewardRedemptions.rewardId],
    references: [rewards.id],
  }),
  transaction: one(loyaltyTransactions, {
    fields: [rewardRedemptions.transactionId],
    references: [loyaltyTransactions.id],
  }),
  redeemedByUser: one(users, {
    fields: [rewardRedemptions.redeemedByUserId],
    references: [users.id],
  }),
}));

export const rewardCatalogAuditsRelations = relations(rewardCatalogAudits, ({ one }) => ({
  reward: one(rewards, {
    fields: [rewardCatalogAudits.rewardId],
    references: [rewards.id],
  }),
  actorUser: one(users, {
    fields: [rewardCatalogAudits.actorUserId],
    references: [users.id],
  }),
}));
