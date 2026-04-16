import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ChatbotEscalationResponseDto } from './chatbot-escalation-response.dto';
import { ChatbotLookupResponseDto } from './chatbot-lookup-response.dto';
import { chatbotConversationResponseTypeEnum } from '../schemas/chatbot.schema';

export class ChatbotMessageResponseDto {
  @ApiProperty({
    example: 'a42fd7a2-f130-4937-9ccb-269a11f17340',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: 'How do I book a service appointment?',
  })
  prompt!: string;

  @ApiPropertyOptional({
    example: 'booking.how_to_book',
  })
  matchedIntentKey?: string | null;

  @ApiProperty({
    enum: chatbotConversationResponseTypeEnum.enumValues,
    example: 'answer',
  })
  responseType!: (typeof chatbotConversationResponseTypeEnum.enumValues)[number];

  @ApiProperty({
    example:
      'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
  })
  responseText!: string;

  @ApiPropertyOptional({
    type: () => ChatbotLookupResponseDto,
  })
  lookup?: ChatbotLookupResponseDto | null;

  @ApiPropertyOptional({
    type: () => ChatbotEscalationResponseDto,
  })
  escalation?: ChatbotEscalationResponseDto | null;

  @ApiProperty({
    example: '2026-07-14T11:35:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-07-14T11:35:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
