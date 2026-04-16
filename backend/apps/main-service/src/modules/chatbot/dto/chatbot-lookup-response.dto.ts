import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { chatbotLookupTypeEnum } from '../schemas/chatbot.schema';

export class ChatbotLookupResponseDto {
  @ApiProperty({
    enum: chatbotLookupTypeEnum.enumValues,
    example: 'booking_status',
  })
  lookupType!: (typeof chatbotLookupTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'booking-1',
  })
  referenceId?: string | null;

  @ApiPropertyOptional({
    example: 'pending',
  })
  status?: string | null;

  @ApiProperty({
    example: 'Your latest booking is pending review for 2026-06-10 at Morning Slot.',
  })
  message!: string;
}
