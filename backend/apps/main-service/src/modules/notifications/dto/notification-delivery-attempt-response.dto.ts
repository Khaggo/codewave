import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { notificationAttemptStatusEnum } from '../schemas/notifications.schema';

export class NotificationDeliveryAttemptResponseDto {
  @ApiProperty({
    example: '8f7ddf73-f7f9-40bb-8e70-ec9469346ba6',
  })
  id!: string;

  @ApiProperty({
    example: '99c2b1bc-e89d-4d55-b7eb-3e49c560a2c5',
  })
  notificationId!: string;

  @ApiProperty({
    example: 1,
  })
  attemptNumber!: number;

  @ApiProperty({
    enum: notificationAttemptStatusEnum.enumValues,
    example: 'sent',
  })
  status!: (typeof notificationAttemptStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'sms-provider-message-123',
  })
  providerMessageId?: string | null;

  @ApiPropertyOptional({
    example: 'Notification preference disabled for booking reminders.',
  })
  errorMessage?: string | null;

  @ApiProperty({
    example: '2026-04-20T08:30:00.000Z',
    format: 'date-time',
  })
  attemptedAt!: string;
}
