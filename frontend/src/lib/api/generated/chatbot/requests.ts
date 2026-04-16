export interface CreateChatbotMessageRequest {
  message: string;
}

export interface CreateChatbotEscalationRequest {
  prompt: string;
  reason?: string;
  conversationId?: string;
}
