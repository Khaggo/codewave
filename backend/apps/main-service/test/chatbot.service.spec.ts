import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { ChatbotRepository } from '@main-modules/chatbot/repositories/chatbot.repository';
import { ChatbotService } from '@main-modules/chatbot/services/chatbot.service';
import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { UsersService } from '@main-modules/users/services/users.service';

describe('ChatbotService', () => {
  it('blocks customers from listing chatbot intents', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: ChatbotRepository,
          useValue: {
            listActiveIntents: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'customer-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByUserId: jest.fn() } },
        { provide: InsuranceRepository, useValue: { findByUserId: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(ChatbotService);

    await expect(
      service.listIntents({
        userId: 'customer-1',
        role: 'customer',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the booking how-to-book FAQ deterministically', async () => {
    const chatbotRepository = {
      listActiveRules: jest.fn().mockResolvedValue([
        {
          id: 'rule-1',
          priority: 300,
          keywords: ['book service', 'appointment'],
          intent: {
            id: 'intent-1',
            intentKey: 'booking.how_to_book',
            responseTemplate:
              'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
            lookupType: null,
          },
        },
      ]),
      createConversation: jest.fn().mockResolvedValue({
        id: 'conversation-1',
        userId: 'customer-1',
        prompt: 'How do I book a service appointment?',
        responseType: 'answer',
        responseText:
          'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
        lookupPayload: null,
        createdAt: new Date('2026-07-14T11:35:00.000Z'),
        updatedAt: new Date('2026-07-14T11:35:00.000Z'),
        intent: {
          intentKey: 'booking.how_to_book',
        },
        escalation: null,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ChatbotRepository, useValue: chatbotRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'customer-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByUserId: jest.fn() } },
        { provide: InsuranceRepository, useValue: { findByUserId: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(ChatbotService);

    const result = await service.sendMessage(
      {
        message: 'How do I book a service appointment?',
      },
      {
        userId: 'customer-1',
        role: 'customer',
      },
    );

    expect(chatbotRepository.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        intentId: 'intent-1',
        responseType: 'answer',
      }),
    );
    expect(result.matchedIntentKey).toBe('booking.how_to_book');
    expect(result.responseType).toBe('answer');
  });

  it('returns the latest insurance inquiry status through the allowed lookup path', async () => {
    const chatbotRepository = {
      listActiveRules: jest.fn().mockResolvedValue([
        {
          id: 'rule-2',
          priority: 240,
          keywords: ['insurance status', 'claim status'],
          intent: {
            id: 'intent-2',
            intentKey: 'insurance.latest_status',
            responseTemplate: 'Here is the latest insurance inquiry status I found for your account.',
            lookupType: 'insurance_status',
          },
        },
      ]),
      createConversation: jest.fn().mockResolvedValue({
        id: 'conversation-2',
        userId: 'customer-1',
        prompt: 'What is my insurance status?',
        responseType: 'lookup',
        responseText: 'Your latest insurance inquiry is under_review for "Accident repair" (comprehensive).',
        lookupPayload: {
          lookupType: 'insurance_status',
          referenceId: 'insurance-1',
          status: 'under_review',
          message:
            'Your latest insurance inquiry is under_review for "Accident repair" (comprehensive).',
        },
        createdAt: new Date('2026-07-14T11:36:00.000Z'),
        updatedAt: new Date('2026-07-14T11:36:00.000Z'),
        intent: {
          intentKey: 'insurance.latest_status',
        },
        escalation: null,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ChatbotRepository, useValue: chatbotRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'customer-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByUserId: jest.fn() } },
        {
          provide: InsuranceRepository,
          useValue: {
            findByUserId: jest.fn().mockResolvedValue([
              {
                id: 'insurance-1',
                status: 'under_review',
                subject: 'Accident repair',
                inquiryType: 'comprehensive',
              },
            ]),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(ChatbotService);

    const result = await service.sendMessage(
      {
        message: 'What is my insurance status?',
      },
      {
        userId: 'customer-1',
        role: 'customer',
      },
    );

    expect(result.responseType).toBe('lookup');
    expect(result.lookup).toEqual(
      expect.objectContaining({
        lookupType: 'insurance_status',
        referenceId: 'insurance-1',
        status: 'under_review',
      }),
    );
  });

  it('escalates unsupported prompts instead of inventing an answer', async () => {
    const chatbotRepository = {
      listActiveRules: jest.fn().mockResolvedValue([]),
      createEscalation: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        userId: 'customer-1',
        prompt: 'Can you estimate my repair bill?',
        reason: 'unsupported_prompt',
        status: 'open',
        createdAt: new Date('2026-07-14T11:37:00.000Z'),
        updatedAt: new Date('2026-07-14T11:37:00.000Z'),
        intent: null,
      }),
      createConversation: jest.fn().mockResolvedValue({
        id: 'conversation-3',
        userId: 'customer-1',
        prompt: 'Can you estimate my repair bill?',
        responseType: 'escalation',
        responseText:
          'I could not match that request to an approved FAQ flow, so I opened an escalation for staff follow-up.',
        lookupPayload: null,
        createdAt: new Date('2026-07-14T11:37:00.000Z'),
        updatedAt: new Date('2026-07-14T11:37:00.000Z'),
        intent: null,
        escalation: {
          id: 'escalation-1',
          userId: 'customer-1',
          prompt: 'Can you estimate my repair bill?',
          reason: 'unsupported_prompt',
          status: 'open',
          createdAt: new Date('2026-07-14T11:37:00.000Z'),
          updatedAt: new Date('2026-07-14T11:37:00.000Z'),
          intent: null,
        },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ChatbotRepository, useValue: chatbotRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'customer-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByUserId: jest.fn() } },
        { provide: InsuranceRepository, useValue: { findByUserId: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(ChatbotService);

    const result = await service.sendMessage(
      {
        message: 'Can you estimate my repair bill?',
      },
      {
        userId: 'customer-1',
        role: 'customer',
      },
    );

    expect(chatbotRepository.createEscalation).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'unsupported_prompt',
      }),
    );
    expect(result.responseType).toBe('escalation');
    expect(result.escalation).toEqual(
      expect.objectContaining({
        id: 'escalation-1',
        reason: 'unsupported_prompt',
      }),
    );
  });
});
