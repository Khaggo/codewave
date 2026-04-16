import { relations } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userRoleEnum, users } from '@main-modules/users/schemas/users.schema';

export const authAccounts = pgTable('auth_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authProviderEnum = pgEnum('auth_provider', ['google']);

export const authOtpPurposeEnum = pgEnum('auth_otp_purpose', [
  'customer_signup',
  'staff_activation',
]);

export const authGoogleIdentities = pgTable('auth_google_identities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  provider: authProviderEnum('provider').notNull().default('google'),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authOtpChallenges = pgTable('auth_otp_challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: authOtpPurposeEnum('purpose').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loginAuditLogs = pgTable('login_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 64 }),
  wasSuccessful: boolean('was_successful').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const staffAdminAuditActionEnum = pgEnum('staff_admin_audit_action', [
  'staff_account_provisioned',
  'staff_account_status_changed',
]);

export const staffAdminAuditLogs = pgTable('staff_admin_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: staffAdminAuditActionEnum('action').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: userRoleEnum('actor_role').notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),
  targetRole: userRoleEnum('target_role').notNull(),
  targetEmail: varchar('target_email', { length: 255 }).notNull(),
  targetStaffCode: varchar('target_staff_code', { length: 40 }),
  previousIsActive: boolean('previous_is_active'),
  nextIsActive: boolean('next_is_active'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authAccountsRelations = relations(authAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [authAccounts.userId],
    references: [users.id],
  }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const authGoogleIdentitiesRelations = relations(authGoogleIdentities, ({ one }) => ({
  user: one(users, {
    fields: [authGoogleIdentities.userId],
    references: [users.id],
  }),
}));

export const authOtpChallengesRelations = relations(authOtpChallenges, ({ one }) => ({
  user: one(users, {
    fields: [authOtpChallenges.userId],
    references: [users.id],
  }),
}));

export const staffAdminAuditLogsRelations = relations(staffAdminAuditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [staffAdminAuditLogs.actorUserId],
    references: [users.id],
  }),
  target: one(users, {
    fields: [staffAdminAuditLogs.targetUserId],
    references: [users.id],
  }),
}));
