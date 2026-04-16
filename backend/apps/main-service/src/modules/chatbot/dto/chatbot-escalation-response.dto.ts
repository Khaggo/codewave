import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { chatbotEscalationStatusEnum } from '../schemas/chatbot.schema';

export class ChatbotEscalationResponseDto {
  @ApiProperty({
    example: 'cc6f2a88-8b81-4117-bbfe-a99f81f5b1ce',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiPropertyOptional({
    example: 'booking.latest_status',
  })
  intentKey?: string | null;

  @ApiProperty({
    example: 'I need help with a concern that is outside the current chatbot rules.',
  })
  prompt!: string;

  @ApiProperty({
    example: 'unsupported_prompt',
  })
  reason!: string;

  @ApiProperty({
    enum: chatbotEscalationStatusEnum.enumValues,
    example: 'open',
  })
  status!: (typeof chatbotEscalationStatusEnum.enumValues)[number];

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
