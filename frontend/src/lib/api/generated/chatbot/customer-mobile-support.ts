import type { RouteContract } from '../shared';
import type {
  ChatbotEscalationResponse,
  ChatbotMessageResponse,
} from './responses';

export type CustomerChatbotRole = 'customer';

export type CustomerChatbotAccessState =
  | 'support_ready'
  | 'support_session_required'
  | 'support_forbidden_role';

export type CustomerChatbotMessageState =
  | 'message_idle'
  | 'message_submitting'
  | 'message_answered'
  | 'message_lookup_resolved'
  | 'message_lookup_empty'
  | 'message_escalated'
  | 'message_failed';

export type CustomerChatbotEscalationState =
  | 'manual_escalation_ready'
  | 'manual_escalation_submitting'
  | 'manual_escalation_saved'
  | 'manual_escalation_failed';

export type CustomerChatbotDeepLinkTarget =
  | 'booking_create'
  | 'booking_tracking'
  | 'insurance_tracking';

export interface CustomerChatbotQuickPrompt {
  key: string;
  label: string;
  prompt: string;
  intentKey: string;
  target?: CustomerChatbotDeepLinkTarget | null;
}

export interface CustomerChatbotAccessRule {
  state: CustomerChatbotAccessState;
  surface: 'customer-mobile';
  truth: 'client-guard' | 'synchronous-auth-record';
  allowedRoles: CustomerChatbotRole[];
  routeKeys: Array<'createMessage' | 'createEscalation'>;
  description: string;
}

export const customerChatbotRoutes = {
  createMessage: {
    method: 'POST',
    path: '/api/chatbot/messages',
    status: 'live',
    source: 'swagger',
    notes:
      'Routes a customer prompt through deterministic FAQ and lookup rules using the authenticated account context.',
  } satisfies RouteContract,
  createEscalation: {
    method: 'POST',
    path: '/api/chatbot/escalations',
    status: 'live',
    source: 'swagger',
    notes:
      'Opens a manual staff follow-up when a supported answer still needs customer-safe escalation.',
  } satisfies RouteContract,
} as const;

export const customerChatbotQuickPrompts: CustomerChatbotQuickPrompt[] = [
  {
    key: 'booking-how-to-book',
    label: 'How do I book?',
    prompt: 'How do I book a service appointment?',
    intentKey: 'booking.how_to_book',
    target: 'booking_create',
  },
  {
    key: 'booking-latest-status',
    label: 'Latest booking status',
    prompt: 'What is my booking status?',
    intentKey: 'booking.latest_status',
    target: 'booking_tracking',
  },
  {
    key: 'insurance-required-documents',
    label: 'Insurance documents',
    prompt: 'What documents do I need for insurance?',
    intentKey: 'insurance.required_documents',
    target: 'insurance_tracking',
  },
  {
    key: 'insurance-latest-status',
    label: 'Latest insurance status',
    prompt: 'What is my insurance inquiry status?',
    intentKey: 'insurance.latest_status',
    target: 'insurance_tracking',
  },
  {
    key: 'workshop-support-window',
    label: 'Workshop support window',
    prompt: 'When can I contact the workshop?',
    intentKey: 'workshop.support_window',
    target: null,
  },
];

export const customerChatbotAccessRules: CustomerChatbotAccessRule[] = [
  {
    state: 'support_ready',
    surface: 'customer-mobile',
    truth: 'synchronous-auth-record',
    allowedRoles: ['customer'],
    routeKeys: ['createMessage', 'createEscalation'],
    description:
      'A signed-in customer can ask deterministic FAQ questions and request manual escalation for customer-safe support follow-up.',
  },
  {
    state: 'support_session_required',
    surface: 'customer-mobile',
    truth: 'client-guard',
    allowedRoles: [],
    routeKeys: ['createMessage', 'createEscalation'],
    description:
      'The live support routes require a customer session before booking or insurance lookups may run.',
  },
  {
    state: 'support_forbidden_role',
    surface: 'customer-mobile',
    truth: 'client-guard',
    allowedRoles: [],
    routeKeys: ['createMessage', 'createEscalation'],
    description:
      'This mobile support flow is customer-only even though the backend routes can be used by staff elsewhere.',
  },
];

export const canUseCustomerChatbot = (role?: string | null): role is CustomerChatbotRole =>
  role === 'customer';

export const getCustomerChatbotAccessState = ({
  role,
  hasSession,
}: {
  role?: string | null;
  hasSession?: boolean;
}): CustomerChatbotAccessState => {
  if (!hasSession) {
    return 'support_session_required';
  }

  if (!canUseCustomerChatbot(role)) {
    return 'support_forbidden_role';
  }

  return 'support_ready';
};

export const getCustomerChatbotMessageState = (
  message?: ChatbotMessageResponse | null,
): CustomerChatbotMessageState => {
  if (!message) {
    return 'message_idle';
  }

  if (message.responseType === 'answer') {
    return 'message_answered';
  }

  if (message.responseType === 'lookup') {
    return message.lookup?.referenceId
      ? 'message_lookup_resolved'
      : 'message_lookup_empty';
  }

  if (message.responseType === 'escalation') {
    return 'message_escalated';
  }

  return 'message_failed';
};

export const canManualEscalateChatbotMessage = (
  message?: ChatbotMessageResponse | null,
) => Boolean(message?.id && !message?.escalation);

export const getCustomerChatbotEscalationState = (
  escalation?: ChatbotEscalationResponse | null,
): Extract<
  CustomerChatbotEscalationState,
  'manual_escalation_ready' | 'manual_escalation_saved'
> => (escalation ? 'manual_escalation_saved' : 'manual_escalation_ready');

export const customerChatbotContractSources = [
  'docs/architecture/domains/main-service/chatbot.md',
  'docs/architecture/tasks/05-client-integration/T522-faq-chatbot-customer-support-mobile-flow.md',
  'docs/contracts/T114-faq-chatbot-v1.md',
  'docs/contracts/T522-faq-chatbot-customer-support-mobile-flow.md',
  'backend/apps/main-service/src/modules/chatbot/controllers/chatbot.controller.ts',
  'mobile/src/lib/chatbotClient.js',
  'mobile/src/screens/ChatbotScreen.js',
] as const;
