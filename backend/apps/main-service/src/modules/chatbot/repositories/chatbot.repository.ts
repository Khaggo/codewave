import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';

import { BaseRepository } from '@shared/base/base.repository';
import { DRIZZLE_DB } from '@shared/db/database.constants';
import { AppDatabase } from '@shared/db/database.types';

import {
  chatbotConversationResponseTypeEnum,
  chatbotConversations,
  chatbotEscalations,
  chatbotIntents,
  chatbotRules,
  ChatbotLookupPayload,
} from '../schemas/chatbot.schema';

const defaultIntentCatalog = [
  {
    intentKey: 'booking.how_to_book',
    label: 'How to book a service',
    description: 'Explains the minimum information required to create a booking.',
    intentType: 'faq' as const,
    responseTemplate:
      'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: ['book service', 'booking', 'appointment', 'schedule service'],
    priority: 300,
  },
  {
    intentKey: 'booking.latest_status',
    label: 'Latest booking status',
    description: 'Looks up the most recent booking attached to the signed-in user.',
    intentType: 'lookup' as const,
    responseTemplate: 'Here is the latest booking status I found for your account.',
    lookupType: 'booking_status' as const,
    visibility: 'all' as const,
    keywords: ['booking status', 'appointment status', 'my booking', 'latest booking'],
    priority: 280,
  },
  {
    intentKey: 'insurance.required_documents',
    label: 'Insurance inquiry requirements',
    description: 'Explains the deterministic insurance inquiry input and supporting files.',
    intentType: 'faq' as const,
    responseTemplate:
      'Start with the customer and vehicle reference, inquiry type, subject, description, and any supporting files you already have. A service adviser can request additional documents during review.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: [
      'insurance documents',
      'insurance document',
      'required documents',
      'claim documents',
      'documents do i need',
      'insurance requirements',
    ],
    priority: 260,
  },
  {
    intentKey: 'insurance.latest_status',
    label: 'Latest insurance inquiry status',
    description: 'Looks up the most recent insurance inquiry attached to the signed-in user.',
    intentType: 'lookup' as const,
    responseTemplate: 'Here is the latest insurance inquiry status I found for your account.',
    lookupType: 'insurance_status' as const,
    visibility: 'all' as const,
    keywords: ['insurance status', 'claim status', 'my insurance', 'inquiry status'],
    priority: 240,
  },
  {
    intentKey: 'workshop.support_window',
    label: 'Workshop support window',
    description:
      'Explains that the chatbot is always available for FAQ routing while staff follow-up is asynchronous.',
    intentType: 'faq' as const,
    responseTemplate:
      'I can answer booking and insurance FAQs any time. If your concern needs manual review or is outside the approved rules, I will open an escalation for a service adviser follow-up.',
    lookupType: null,
    visibility: 'all' as const,
    keywords: ['business hours', 'support hours', 'open today', 'workshop hours'],
    priority: 200,
  },
] as const;

@Injectable()
export class ChatbotRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDatabase) {
    super();
  }

  async listActiveRules() {
    await this.ensureDefaultCatalog();
    return this.db.query.chatbotRules.findMany({
      where: eq(chatbotRules.isActive, true),
      with: {
        intent: true,
      },
      orderBy: [desc(chatbotRules.priority), asc(chatbotRules.ruleKey)],
    });
  }

  async listActiveIntents() {
    await this.ensureDefaultCatalog();
    return this.db.query.chatbotIntents.findMany({
      where: eq(chatbotIntents.isActive, true),
      with: {
        rules: {
          where: eq(chatbotRules.isActive, true),
          orderBy: [desc(chatbotRules.priority), asc(chatbotRules.ruleKey)],
        },
      },
      orderBy: [asc(chatbotIntents.label), asc(chatbotIntents.intentKey)],
    });
  }

  async findConversationById(id: string) {
    const conversation = await this.db.query.chatbotConversations.findFirst({
      where: eq(chatbotConversations.id, id),
      with: {
        intent: true,
        escalation: {
          with: {
            intent: true,
          },
        },
      },
    });

    return this.assertFound(conversation, 'Chatbot conversation not found');
  }

  async createEscalation(payload: {
    userId: string;
    intentId?: string | null;
    prompt: string;
    reason: string;
  }) {
    const [createdEscalation] = await this.db
      .insert(chatbotEscalations)
      .values({
        userId: payload.userId,
        intentId: payload.intentId ?? null,
        prompt: payload.prompt,
        reason: payload.reason,
      })
      .returning();

    return this.findEscalationById(createdEscalation.id);
  }

  async createConversation(payload: {
    userId: string;
    intentId?: string | null;
    prompt: string;
    responseType: (typeof chatbotConversationResponseTypeEnum.enumValues)[number];
    responseText: string;
    lookupPayload?: ChatbotLookupPayload | null;
    escalationId?: string | null;
  }) {
    const [createdConversation] = await this.db
      .insert(chatbotConversations)
      .values({
        userId: payload.userId,
        intentId: payload.intentId ?? null,
        prompt: payload.prompt,
        responseType: payload.responseType,
        responseText: payload.responseText,
        lookupPayload: payload.lookupPayload ?? null,
        escalationId: payload.escalationId ?? null,
      })
      .returning();

    return this.findConversationById(createdConversation.id);
  }

  private async findEscalationById(id: string) {
    const escalation = await this.db.query.chatbotEscalations.findFirst({
      where: eq(chatbotEscalations.id, id),
      with: {
        intent: true,
      },
    });

    return this.assertFound(escalation, 'Chatbot escalation not found');
  }

  private async ensureDefaultCatalog() {
    await this.db
      .insert(chatbotIntents)
      .values(
        defaultIntentCatalog.map((intent) => ({
          intentKey: intent.intentKey,
          label: intent.label,
          description: intent.description,
          intentType: intent.intentType,
          responseTemplate: intent.responseTemplate,
          lookupType: intent.lookupType,
          visibility: intent.visibility,
        })),
      )
      .onConflictDoNothing({
        target: chatbotIntents.intentKey,
      });

    const seededIntents = await this.db.query.chatbotIntents.findMany({
      where: eq(chatbotIntents.isActive, true),
    });
    const intentIdByKey = new Map(
      seededIntents.map((intent: (typeof seededIntents)[number]) => [intent.intentKey, intent.id]),
    );

    await this.db
      .insert(chatbotRules)
      .values(
        defaultIntentCatalog.map((intent) => ({
          ruleKey: `${intent.intentKey}.keywords`,
          intentId: intentIdByKey.get(intent.intentKey) as string,
          keywords: [...intent.keywords],
          priority: intent.priority,
        })),
      )
      .onConflictDoNothing({
        target: chatbotRules.ruleKey,
      });
  }
}
