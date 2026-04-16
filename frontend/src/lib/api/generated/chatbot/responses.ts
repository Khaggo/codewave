export type ChatbotConversationResponseType = 'answer' | 'lookup' | 'escalation';
export type ChatbotIntentType = 'faq' | 'lookup';
export type ChatbotIntentVisibility = 'all' | 'staff_only';
export type ChatbotLookupType = 'booking_status' | 'insurance_status';
export type ChatbotEscalationStatus = 'open' | 'reviewed';

export interface ChatbotLookupResponse {
  lookupType: ChatbotLookupType;
  referenceId?: string | null;
  status?: string | null;
  message: string;
}

export interface ChatbotEscalationResponse {
  id: string;
  userId: string;
  intentKey?: string | null;
  prompt: string;
  reason: string;
  status: ChatbotEscalationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotMessageResponse {
  id: string;
  userId: string;
  prompt: string;
  matchedIntentKey?: string | null;
  responseType: ChatbotConversationResponseType;
  responseText: string;
  lookup?: ChatbotLookupResponse | null;
  escalation?: ChatbotEscalationResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotIntentResponse {
  id: string;
  intentKey: string;
  label: string;
  description: string;
  intentType: ChatbotIntentType;
  lookupType?: ChatbotLookupType | null;
  visibility: ChatbotIntentVisibility;
  keywords: string[];
  responseTemplate: string;
}
