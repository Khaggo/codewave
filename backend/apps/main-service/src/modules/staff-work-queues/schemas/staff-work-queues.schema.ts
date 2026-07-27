import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const staffWorkQueueTypeEnum = pgEnum('staff_work_queue_type', ['job_order', 'qa']);
export const staffQueueSessionStatusEnum = pgEnum('staff_queue_session_status', ['available', 'paused']);
export const staffWorkEntityTypeEnum = pgEnum('staff_work_entity_type', ['booking_handoff', 'job_order']);
export const staffWorkClaimStatusEnum = pgEnum('staff_work_claim_status', [
  'active',
  'completed',
  'released',
  'expired',
  'reassigned',
]);

export const staffQueueSessions = pgTable(
  'staff_queue_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    queueType: staffWorkQueueTypeEnum('queue_type').notNull(),
    status: staffQueueSessionStatusEnum('status').notNull().default('paused'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userQueueUnique: uniqueIndex('staff_queue_sessions_user_queue_idx').on(
      table.userId,
      table.queueType,
    ),
    dispatchOrderIndex: index('staff_queue_sessions_dispatch_order_idx').on(
      table.queueType,
      table.status,
      table.lastAssignedAt,
      table.lastSeenAt,
    ),
  }),
);

export const staffWorkClaims = pgTable(
  'staff_work_claims',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    queueType: staffWorkQueueTypeEnum('queue_type').notNull(),
    entityType: staffWorkEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: staffWorkClaimStatusEnum('status').notNull().default('active'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
    heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releaseReason: text('release_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeEntityUnique: uniqueIndex('staff_work_claims_active_entity_idx')
      .on(table.queueType, table.entityType, table.entityId)
      .where(sql`${table.status} = 'active'`),
    activeOwnerQueueIndex: index('staff_work_claims_active_owner_queue_idx').on(
      table.queueType,
      table.ownerUserId,
      table.status,
    ),
    queueStatusLeaseIndex: index('staff_work_claims_queue_status_lease_idx').on(
      table.queueType,
      table.status,
      table.leaseExpiresAt,
    ),
    entityHistoryIndex: index('staff_work_claims_entity_history_idx').on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  }),
);

export const staffQueueSessionsRelations = relations(staffQueueSessions, ({ one }) => ({
  user: one(users, {
    fields: [staffQueueSessions.userId],
    references: [users.id],
  }),
}));

export const staffWorkClaimsRelations = relations(staffWorkClaims, ({ one }) => ({
  owner: one(users, {
    fields: [staffWorkClaims.ownerUserId],
    references: [users.id],
  }),
}));
