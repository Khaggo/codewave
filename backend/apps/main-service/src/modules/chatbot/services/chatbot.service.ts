import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { UsersService } from '@main-modules/users/services/users.service';

import { CreateChatbotEscalationDto } from '../dto/create-chatbot-escalation.dto';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { ChatbotRepository } from '../repositories/chatbot.repository';

type ChatbotActor = {
  userId: string;
  role: string;
};

type ActiveIntent = Awaited<ReturnType<ChatbotRepository['listActiveIntents']>>[number];
type MatchedRule = Awaited<ReturnType<ChatbotRepository['listActiveRules']>>[number];

@Injectable()
export class ChatbotService {
  constructor(
    private readonly chatbotRepository: ChatbotRepository,
    private readonly usersService: UsersService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly insuranceRepository: InsuranceRepository,
  ) {}

  async listIntents(actor: ChatbotActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    if (!['service_adviser', 'super_admin'].includes(resolvedActor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can inspect chatbot intents');
    }

    const intents = await this.chatbotRepository.listActiveIntents();
    return intents.map((intent: ActiveIntent) => ({
      id: intent.id,
      intentKey: intent.intentKey,
      label: intent.label,
      description: intent.description,
      intentType: intent.intentType,
      lookupType: intent.lookupType,
      visibility: intent.visibility,
      responseTemplate: intent.responseTemplate,
      keywords: intent.rules.flatMap((rule: ActiveIntent['rules'][number]) => rule.keywords),
    }));
  }

  async sendMessage(payload: CreateChatbotMessageDto, actor: ChatbotActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    const matchedRule = await this.matchRule(payload.message);

    if (!matchedRule) {
      const escalation = await this.chatbotRepository.createEscalation({
        userId: resolvedActor.id,
        prompt: payload.message,
        reason: 'unsupported_prompt',
      });

      return this.mapConversation(
        await this.chatbotRepository.createConversation({
          userId: resolvedActor.id,
          prompt: payload.message,
          responseType: 'escalation',
          responseText:
            'I could not match that request to an approved FAQ flow, so I opened an escalation for staff follow-up.',
          escalationId: escalation.id,
        }),
      );
    }

    const resolvedReply = await this.resolveIntentReply(matchedRule, resolvedActor.id);
    return this.mapConversation(
      await this.chatbotRepository.createConversation({
        userId: resolvedActor.id,
        intentId: matchedRule.intent.id,
        prompt: payload.message,
        responseType: resolvedReply.responseType,
        responseText: resolvedReply.responseText,
        lookupPayload: resolvedReply.lookup ?? null,
      }),
    );
  }

  async createEscalation(payload: CreateChatbotEscalationDto, actor: ChatbotActor) {
    const resolvedActor = await this.assertActiveActor(actor.userId);
    let intentId: string | null = null;

    if (payload.conversationId) {
      const conversation = await this.chatbotRepository.findConversationById(payload.conversationId);
      if (conversation.userId !== resolvedActor.id) {
        throw new ForbiddenException('You can only escalate your own chatbot conversations');
      }

      intentId = conversation.intentId ?? null;
    }

    return this.mapEscalation(
      await this.chatbotRepository.createEscalation({
        userId: resolvedActor.id,
        intentId,
        prompt: payload.prompt,
        reason: payload.reason?.trim() || 'manual_escalation',
      }),
    );
  }

  private async resolveIntentReply(rule: MatchedRule, userId: string) {
    if (rule.intent.lookupType === 'booking_status') {
      const latestBooking = (await this.bookingsRepository.findByUserId(userId))[0];
      if (!latestBooking) {
        const message =
          'I could not find a booking for your account yet. To create one, choose your vehicle, date, time slot, and at least one service.';
        return {
          responseType: 'lookup' as const,
          responseText: message,
          lookup: {
            lookupType: 'booking_status' as const,
            referenceId: null,
            status: null,
            message,
          },
        };
      }

      const requestedServices = latestBooking.requestedServices
        .map((serviceLink) => serviceLink.service.name)
        .join(', ');
      const timeSlot = Array.isArray(latestBooking.timeSlot)
        ? latestBooking.timeSlot[0]
        : latestBooking.timeSlot;
      const responseText = `Your latest booking is ${latestBooking.status} for ${latestBooking.scheduledDate}${timeSlot ? ` at ${timeSlot.label}` : ''}.${requestedServices ? ` Requested services: ${requestedServices}.` : ''}`;

      return {
        responseType: 'lookup' as const,
        responseText,
        lookup: {
          lookupType: 'booking_status' as const,
          referenceId: latestBooking.id,
          status: latestBooking.status,
          message: responseText,
        },
      };
    }

    if (rule.intent.lookupType === 'insurance_status') {
      const latestInquiry = (await this.insuranceRepository.findByUserId(userId))[0];
      if (!latestInquiry) {
        const message =
          'I could not find an insurance inquiry for your account yet. You can start one with your vehicle, inquiry type, subject, description, and supporting files.';
        return {
          responseType: 'lookup' as const,
          responseText: message,
          lookup: {
            lookupType: 'insurance_status' as const,
            referenceId: null,
            status: null,
            message,
          },
        };
      }

      const responseText = `Your latest insurance inquiry is ${latestInquiry.status} for "${latestInquiry.subject}" (${latestInquiry.inquiryType}).`;

      return {
        responseType: 'lookup' as const,
        responseText,
        lookup: {
          lookupType: 'insurance_status' as const,
          referenceId: latestInquiry.id,
          status: latestInquiry.status,
          message: responseText,
        },
      };
    }

    return {
      responseType: 'answer' as const,
      responseText: rule.intent.responseTemplate,
      lookup: null,
    };
  }

  private async matchRule(message: string) {
    const normalizedMessage = this.normalize(message);
    const rules: MatchedRule[] = await this.chatbotRepository.listActiveRules();
    const scoredRules = rules
      .map((rule: MatchedRule) => {
        const matchedKeywords = rule.keywords.filter((keyword: string) =>
          normalizedMessage.includes(this.normalize(keyword)),
        );

        return {
          rule,
          matchedKeywords,
        };
      })
      .filter(({ matchedKeywords }: { matchedKeywords: string[] }) => matchedKeywords.length > 0)
      .sort((left: { rule: MatchedRule; matchedKeywords: string[] }, right: { rule: MatchedRule; matchedKeywords: string[] }) => {
        if (right.matchedKeywords.length !== left.matchedKeywords.length) {
          return right.matchedKeywords.length - left.matchedKeywords.length;
        }

        if (right.rule.priority !== left.rule.priority) {
          return right.rule.priority - left.rule.priority;
        }

        return left.rule.intent.intentKey.localeCompare(right.rule.intent.intentKey);
      });

    return scoredRules[0]?.rule ?? null;
  }

  private async assertActiveActor(userId: string) {
    const actor = await this.usersService.findById(userId);
    if (!actor || !actor.isActive) {
      throw new NotFoundException('Chatbot actor not found');
    }

    return actor;
  }

  private mapConversation(conversation: Awaited<ReturnType<ChatbotRepository['findConversationById']>>) {
    return {
      id: conversation.id,
      userId: conversation.userId,
      prompt: conversation.prompt,
      matchedIntentKey: conversation.intent?.intentKey ?? null,
      responseType: conversation.responseType,
      responseText: conversation.responseText,
      lookup: conversation.lookupPayload ?? null,
      escalation: conversation.escalation ? this.mapEscalation(conversation.escalation) : null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private mapEscalation(escalation: {
    id: string;
    userId: string;
    prompt: string;
    reason: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    intent?: { intentKey: string } | null;
  }) {
    return {
      id: escalation.id,
      userId: escalation.userId,
      intentKey: escalation.intent?.intentKey ?? null,
      prompt: escalation.prompt,
      reason: escalation.reason,
      status: escalation.status,
      createdAt: escalation.createdAt.toISOString(),
      updatedAt: escalation.updatedAt.toISOString(),
    };
  }

  private normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
