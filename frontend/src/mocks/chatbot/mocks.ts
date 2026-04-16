import type {
  ChatbotEscalationResponse,
  ChatbotIntentResponse,
  ChatbotMessageResponse,
} from '../../lib/api/generated/chatbot/responses';

export const chatbotBookingFaqMock: ChatbotMessageResponse = {
  id: 'chatbot-conversation-1',
  userId: 'user-1',
  prompt: 'How do I book a service appointment?',
  matchedIntentKey: 'booking.how_to_book',
  responseType: 'answer',
  responseText:
    'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
  lookup: null,
  escalation: null,
  createdAt: '2026-07-14T11:35:00.000Z',
  updatedAt: '2026-07-14T11:35:00.000Z',
};

export const chatbotInsuranceFaqMock: ChatbotMessageResponse = {
  id: 'chatbot-conversation-2',
  userId: 'user-1',
  prompt: 'What documents do I need for insurance?',
  matchedIntentKey: 'insurance.required_documents',
  responseType: 'answer',
  responseText:
    'Start with the customer and vehicle reference, inquiry type, subject, description, and any supporting files you already have. A service adviser can request additional documents during review.',
  lookup: null,
  escalation: null,
  createdAt: '2026-07-14T11:36:00.000Z',
  updatedAt: '2026-07-14T11:36:00.000Z',
};

export const chatbotBookingLookupMock: ChatbotMessageResponse = {
  id: 'chatbot-conversation-3',
  userId: 'user-1',
  prompt: 'What is my booking status?',
  matchedIntentKey: 'booking.latest_status',
  responseType: 'lookup',
  responseText:
    'Your latest booking is pending for 2026-07-14 at Morning Slot. Requested services: Oil Change.',
  lookup: {
    lookupType: 'booking_status',
    referenceId: 'booking-1',
    status: 'pending',
    message:
      'Your latest booking is pending for 2026-07-14 at Morning Slot. Requested services: Oil Change.',
  },
  escalation: null,
  createdAt: '2026-07-14T11:37:00.000Z',
  updatedAt: '2026-07-14T11:37:00.000Z',
};

export const chatbotEscalationMock: ChatbotEscalationResponse = {
  id: 'chatbot-escalation-1',
  userId: 'user-1',
  intentKey: null,
  prompt: 'Can you estimate my repair bill?',
  reason: 'unsupported_prompt',
  status: 'open',
  createdAt: '2026-07-14T11:38:00.000Z',
  updatedAt: '2026-07-14T11:38:00.000Z',
};

export const chatbotUnsupportedPromptMock: ChatbotMessageResponse = {
  id: 'chatbot-conversation-4',
  userId: 'user-1',
  prompt: 'Can you estimate my repair bill?',
  matchedIntentKey: null,
  responseType: 'escalation',
  responseText:
    'I could not match that request to an approved FAQ flow, so I opened an escalation for staff follow-up.',
  lookup: null,
  escalation: chatbotEscalationMock,
  createdAt: '2026-07-14T11:38:00.000Z',
  updatedAt: '2026-07-14T11:38:00.000Z',
};

export const chatbotIntentCatalogMock: ChatbotIntentResponse[] = [
  {
    id: 'intent-1',
    intentKey: 'booking.how_to_book',
    label: 'How to book a service',
    description: 'Explains the minimum information required to create a booking.',
    intentType: 'faq',
    lookupType: null,
    visibility: 'all',
    keywords: ['book service', 'booking', 'appointment', 'schedule service'],
    responseTemplate:
      'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
  },
  {
    id: 'intent-2',
    intentKey: 'insurance.latest_status',
    label: 'Latest insurance inquiry status',
    description: 'Looks up the most recent insurance inquiry attached to the signed-in user.',
    intentType: 'lookup',
    lookupType: 'insurance_status',
    visibility: 'all',
    keywords: ['insurance status', 'claim status', 'my insurance', 'inquiry status'],
    responseTemplate: 'Here is the latest insurance inquiry status I found for your account.',
  },
];
