import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from '@main-modules/users/schemas/users.schema';

export const chatbotIntentTypeEnum = pgEnum('chatbot_intent_type', ['faq', 'lookup']);
export const chatbotIntentVisibilityEnum = pgEnum('chatbot_intent_visibility', [
  'all',
  'staff_only',
]);
export const chatbotLookupTypeEnum = pgEnum('chatbot_lookup_type', [
  'booking_status',
  'insurance_status',
]);
export const chatbotConversationResponseTypeEnum = pgEnum('chatbot_conversation_response_type', [
  'answer',
  'lookup',
  'escalation',
]);
export const chatbotEscalationStatusEnum = pgEnum('chatbot_escalation_status', ['open', 'reviewed']);

export type ChatbotLookupPayload = {
  lookupType: (typeof chatbotLookupTypeEnum.enumValues)[number];
  referenceId: string | null;
  status: string | null;
  message: string;
};

export const chatbotIntents = pgTable('chatbot_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentKey: varchar('intent_key', { length: 120 }).notNull().unique(),
  label: varchar('label', { length: 160 }).notNull(),
  description: text('description').notNull(),
  intentType: chatbotIntentTypeEnum('intent_type').notNull(),
  responseTemplate: text('response_template').notNull(),
  lookupType: chatbotLookupTypeEnum('lookup_type'),
  visibility: chatbotIntentVisibilityEnum('visibility').notNull().default('all'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotRules = pgTable('chatbot_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleKey: varchar('rule_key', { length: 140 }).notNull().unique(),
  intentId: uuid('intent_id')
    .notNull()
    .references(() => chatbotIntents.id, { onDelete: 'cascade' }),
  keywords: jsonb('keywords').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  priority: integer('priority').notNull().default(100),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotEscalations = pgTable('chatbot_escalations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  intentId: uuid('intent_id').references(() => chatbotIntents.id, { onDelete: 'set null' }),
  prompt: text('prompt').notNull(),
  reason: varchar('reason', { length: 120 }).notNull(),
  status: chatbotEscalationStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotConversations = pgTable('chatbot_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  intentId: uuid('intent_id').references(() => chatbotIntents.id, { onDelete: 'set null' }),
  prompt: text('prompt').notNull(),
  responseType: chatbotConversationResponseTypeEnum('response_type').notNull(),
  responseText: text('response_text').notNull(),
  lookupPayload: jsonb('lookup_payload')
    .$type<ChatbotLookupPayload | null>()
    .default(sql`'null'::jsonb`),
  escalationId: uuid('escalation_id').references(() => chatbotEscalations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotIntentsRelations = relations(chatbotIntents, ({ many }) => ({
  rules: many(chatbotRules),
  conversations: many(chatbotConversations),
  escalations: many(chatbotEscalations),
}));

export const chatbotRulesRelations = relations(chatbotRules, ({ one }) => ({
  intent: one(chatbotIntents, {
    fields: [chatbotRules.intentId],
    references: [chatbotIntents.id],
  }),
}));

export const chatbotEscalationsRelations = relations(chatbotEscalations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatbotEscalations.userId],
    references: [users.id],
  }),
  intent: one(chatbotIntents, {
    fields: [chatbotEscalations.intentId],
    references: [chatbotIntents.id],
  }),
  conversations: many(chatbotConversations),
}));

export const chatbotConversationsRelations = relations(chatbotConversations, ({ one }) => ({
  user: one(users, {
    fields: [chatbotConversations.userId],
    references: [users.id],
  }),
  intent: one(chatbotIntents, {
    fields: [chatbotConversations.intentId],
    references: [chatbotIntents.id],
  }),
  escalation: one(chatbotEscalations, {
    fields: [chatbotConversations.escalationId],
    references: [chatbotEscalations.id],
  }),
}));
