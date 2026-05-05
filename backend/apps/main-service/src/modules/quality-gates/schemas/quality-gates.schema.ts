import { relations } from 'drizzle-orm';
import {
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

import { jobOrders } from '@main-modules/job-orders/schemas/job-orders.schema';
import { userRoleEnum, users } from '@main-modules/users/schemas/users.schema';
import { AiWorkerJobMetadata } from '@shared/queue/ai-worker.types';

export const qualityGateStatusEnum = pgEnum('quality_gate_status', [
  'pending_review',
  'passed',
  'blocked',
  'overridden',
]);

export const qualityPreCheckStatusEnum = pgEnum('quality_pre_check_status', [
  'pending',
  'completed',
  'unavailable',
]);

export const qualityGateReviewerVerdictEnum = pgEnum('quality_gate_reviewer_verdict', [
  'pending',
  'passed',
  'blocked',
]);

export const qualityGateFindingGateEnum = pgEnum('quality_gate_finding_gate', [
  'foundation',
  'gate_1',
  'gate_2',
]);

export const qualityGateFindingSeverityEnum = pgEnum('quality_gate_finding_severity', [
  'info',
  'warning',
  'critical',
]);

export type QualityGateFindingProvenance = {
  provider: string;
  model: string;
  promptVersion: string;
  sourceType: 'booking' | 'back_job';
  ruleId?: string;
  recommendation: 'supported' | 'review_needed' | 'insufficient_context';
  confidence: 'high' | 'medium' | 'low';
  concernSummary: string;
  completedWorkSummary: string;
  matchedKeywords: string[];
  coverageRatio: number;
  evidenceRefs?: string[];
  evidenceSummary?: string;
  riskContribution?: number;
};

export type QualityPreCheckSummary = {
  completedWorkItemCount: number;
  totalWorkItemCount: number;
  attachedPhotoCount: number;
  evidenceGapCount: number;
  semanticMatchScore: number | null;
  evidenceGaps: string[];
  inspectionDiscrepancies: string[];
  automatedRecommendation: 'ready_for_review' | 'manual_review_required';
  infrastructureState: 'available' | 'pre_check_unavailable';
};

export const jobOrderQualityGates = pgTable(
  'job_order_quality_gates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobOrderId: uuid('job_order_id')
      .notNull()
      .references(() => jobOrders.id, { onDelete: 'cascade' }),
    status: qualityGateStatusEnum('status').notNull().default('pending_review'),
    riskScore: integer('risk_score').notNull().default(0),
    blockingReason: text('blocking_reason'),
    preCheckStatus: qualityPreCheckStatusEnum('pre_check_status').notNull().default('pending'),
    preCheckSummary: jsonb('pre_check_summary').$type<QualityPreCheckSummary | null>(),
    headTechnicianUserId: uuid('head_technician_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewerVerdict: qualityGateReviewerVerdictEnum('reviewer_verdict').notNull().default('pending'),
    reviewerNote: text('reviewer_note'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    auditJob: jsonb('audit_job').$type<AiWorkerJobMetadata | null>(),
    lastAuditRequestedAt: timestamp('last_audit_requested_at', { withTimezone: true }).notNull().defaultNow(),
    lastAuditCompletedAt: timestamp('last_audit_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    jobOrderUnique: uniqueIndex('job_order_quality_gates_job_order_id_idx').on(table.jobOrderId),
  }),
);

export const qualityGateFindings = pgTable('quality_gate_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  qualityGateId: uuid('quality_gate_id')
    .notNull()
    .references(() => jobOrderQualityGates.id, { onDelete: 'cascade' }),
  gate: qualityGateFindingGateEnum('gate').notNull().default('foundation'),
  severity: qualityGateFindingSeverityEnum('severity').notNull().default('warning'),
  code: varchar('code', { length: 80 }).notNull(),
  message: text('message').notNull(),
  provenance: jsonb('provenance').$type<QualityGateFindingProvenance | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const qualityGateOverrides = pgTable('quality_gate_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  qualityGateId: uuid('quality_gate_id')
    .notNull()
    .references(() => jobOrderQualityGates.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  actorRole: userRoleEnum('actor_role').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobOrderQualityGatesRelations = relations(jobOrderQualityGates, ({ one, many }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderQualityGates.jobOrderId],
    references: [jobOrders.id],
  }),
  headTechnician: one(users, {
    fields: [jobOrderQualityGates.headTechnicianUserId],
    references: [users.id],
  }),
  findings: many(qualityGateFindings),
  overrides: many(qualityGateOverrides),
}));

export const qualityGateFindingsRelations = relations(qualityGateFindings, ({ one }) => ({
  qualityGate: one(jobOrderQualityGates, {
    fields: [qualityGateFindings.qualityGateId],
    references: [jobOrderQualityGates.id],
  }),
}));

export const qualityGateOverridesRelations = relations(qualityGateOverrides, ({ one }) => ({
  qualityGate: one(jobOrderQualityGates, {
    fields: [qualityGateOverrides.qualityGateId],
    references: [jobOrderQualityGates.id],
  }),
  actor: one(users, {
    fields: [qualityGateOverrides.actorUserId],
    references: [users.id],
  }),
}));
