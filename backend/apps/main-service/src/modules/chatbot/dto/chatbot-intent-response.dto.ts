import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  chatbotIntentTypeEnum,
  chatbotIntentVisibilityEnum,
  chatbotLookupTypeEnum,
} from '../schemas/chatbot.schema';

export class ChatbotIntentResponseDto {
  @ApiProperty({
    example: '5c06b42d-3cc8-483d-944f-a83c68cf86d5',
  })
  id!: string;

  @ApiProperty({
    example: 'booking.how_to_book',
  })
  intentKey!: string;

  @ApiProperty({
    example: 'How to book a service',
  })
  label!: string;

  @ApiProperty({
    example: 'Explains the minimum information required to create a booking.',
  })
  description!: string;

  @ApiProperty({
    enum: chatbotIntentTypeEnum.enumValues,
    example: 'faq',
  })
  intentType!: (typeof chatbotIntentTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: chatbotLookupTypeEnum.enumValues,
    example: 'booking_status',
  })
  lookupType?: (typeof chatbotLookupTypeEnum.enumValues)[number] | null;

  @ApiProperty({
    enum: chatbotIntentVisibilityEnum.enumValues,
    example: 'all',
  })
  visibility!: (typeof chatbotIntentVisibilityEnum.enumValues)[number];

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['book service', 'appointment'],
  })
  keywords!: string[];

  @ApiProperty({
    example:
      'To book a service, choose your vehicle, appointment date, time slot, and at least one service. New bookings start in pending status until staff review.',
  })
  responseTemplate!: string;
}
