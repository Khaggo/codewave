import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateChatbotEscalationDto {
  @ApiProperty({
    example: 'I need help with a billing concern that is not covered by the chatbot rules.',
    description: 'Prompt that should be handed off to staff review.',
    maxLength: 1000,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  prompt!: string;

  @ApiPropertyOptional({
    example: 'billing_follow_up',
    description: 'Optional deterministic escalation reason label.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;

  @ApiPropertyOptional({
    example: 'bf1f16f4-9212-42a7-a4eb-18da47cd7d4a',
    description: 'Optional prior chatbot conversation to attach the escalation to logically.',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
