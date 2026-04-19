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
  'service_payment',
  'service_invoice',
  'purchase_payment',
  'reward_redemption',
  'manual_adjustment',
  'service_reversal',
  'purchase_reversal',
]);

export const rewardTypeEnum = pgEnum('reward_type', ['service_voucher', 'discount_coupon']);

export const rewardStatusEnum = pgEnum('reward_status', ['active', 'inactive']);

export const earningRuleFormulaTypeEnum = pgEnum('earning_rule_formula_type', [
  'flat_points',
  'amount_ratio',
]);

export const earningRuleAccrualSourceEnum = pgEnum('earning_rule_accrual_source', [
  'service',
  'ecommerce',
  'both',
]);

export const earningRuleStatusEnum = pgEnum('earning_rule_status', ['active', 'inactive']);

export const rewardCatalogAuditActionEnum = pgEnum('reward_catalog_audit_action', [
  'created',
  'updated',
  'activated',
  'deactivated',
]);

export const earningRuleAuditActionEnum = pgEnum('earning_rule_audit_action', [
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
  fulfillmentNote: string | null;
  rewardType: (typeof rewardTypeEnum.enumValues)[number];
  pointsCost: number;
  discountPercent: number | null;
  status: (typeof rewardStatusEnum.enumValues)[number];
};

export type LoyaltyEarningRuleSnapshot = {
  name: string;
  description: string | null;
  accrualSource: (typeof earningRuleAccrualSourceEnum.enumValues)[number];
  formulaType: (typeof earningRuleFormulaTypeEnum.enumValues)[number];
  flatPoints: number | null;
  amountStepCents: number | null;
  pointsPerStep: number | null;
  minimumAmountCents: number | null;
  eligibleServiceTypes: string[];
  eligibleServiceCategories: string[];
  eligibleProductIds: string[];
  eligibleProductCategoryIds: string[];
  promoLabel: string | null;
  manualBenefitNote: string | null;
  activeFrom: string | null;
  activeUntil: string | null;
  status: (typeof earningRuleStatusEnum.enumValues)[number];
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
  fulfillmentNote: text('fulfillment_note'),
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

export const loyaltyEarningRules = pgTable('loyalty_earning_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  accrualSource: earningRuleAccrualSourceEnum('accrual_source').notNull().default('service'),
  formulaType: earningRuleFormulaTypeEnum('formula_type').notNull(),
  flatPoints: integer('flat_points'),
  amountStepCents: integer('amount_step_cents'),
  pointsPerStep: integer('points_per_step'),
  minimumAmountCents: integer('minimum_amount_cents'),
  eligibleServiceTypes: jsonb('eligible_service_types').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  eligibleServiceCategories: jsonb('eligible_service_categories')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  eligibleProductIds: jsonb('eligible_product_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  eligibleProductCategoryIds: jsonb('eligible_product_category_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  promoLabel: varchar('promo_label', { length: 160 }),
  manualBenefitNote: text('manual_benefit_note'),
  activeFrom: timestamp('active_from', { withTimezone: true }),
  activeUntil: timestamp('active_until', { withTimezone: true }),
  status: earningRuleStatusEnum('status').notNull().default('inactive'),
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

export const loyaltyEarningRuleAudits = pgTable('loyalty_earning_rule_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  earningRuleId: uuid('earning_rule_id')
    .notNull()
    .references(() => loyaltyEarningRules.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  action: earningRuleAuditActionEnum('action').notNull(),
  reason: text('reason'),
  snapshot: jsonb('snapshot')
    .$type<LoyaltyEarningRuleSnapshot>()
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

export const loyaltyEarningRulesRelations = relations(loyaltyEarningRules, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [loyaltyEarningRules.createdByUserId],
    references: [users.id],
    relationName: 'earning_rule_created_by',
  }),
  updatedByUser: one(users, {
    fields: [loyaltyEarningRules.updatedByUserId],
    references: [users.id],
    relationName: 'earning_rule_updated_by',
  }),
  audits: many(loyaltyEarningRuleAudits),
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

export const loyaltyEarningRuleAuditsRelations = relations(loyaltyEarningRuleAudits, ({ one }) => ({
  earningRule: one(loyaltyEarningRules, {
    fields: [loyaltyEarningRuleAudits.earningRuleId],
    references: [loyaltyEarningRules.id],
  }),
  actorUser: one(users, {
    fields: [loyaltyEarningRuleAudits.actorUserId],
    references: [users.id],
  }),
}));
