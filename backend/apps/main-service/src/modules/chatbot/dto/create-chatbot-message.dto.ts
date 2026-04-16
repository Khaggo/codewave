import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatbotMessageDto {
  @ApiProperty({
    example: 'How do I book a service appointment?',
    description: 'Free-form user prompt sent into the deterministic chatbot router.',
    maxLength: 1000,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  message!: string;
}
