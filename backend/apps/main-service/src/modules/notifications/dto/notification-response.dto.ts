import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  notificationCategoryEnum,
  notificationChannelEnum,
  notificationSourceTypeEnum,
  notificationStatusEnum,
} from '../schemas/notifications.schema';

import { NotificationDeliveryAttemptResponseDto } from './notification-delivery-attempt-response.dto';

export class NotificationResponseDto {
  @ApiProperty({
    example: '99c2b1bc-e89d-4d55-b7eb-3e49c560a2c5',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    enum: notificationCategoryEnum.enumValues,
    example: 'booking_reminder',
  })
  category!: (typeof notificationCategoryEnum.enumValues)[number];

  @ApiProperty({
    enum: notificationChannelEnum.enumValues,
    example: 'sms',
  })
  channel!: (typeof notificationChannelEnum.enumValues)[number];

  @ApiProperty({
    enum: notificationSourceTypeEnum.enumValues,
    example: 'booking',
  })
  sourceType!: (typeof notificationSourceTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  sourceId!: string;

  @ApiProperty({
    example: 'Upcoming service appointment',
  })
  title!: string;

  @ApiProperty({
    example: 'Your booking is scheduled tomorrow at 9:00 AM.',
  })
  message!: string;

  @ApiProperty({
    enum: notificationStatusEnum.enumValues,
    example: 'queued',
  })
  status!: (typeof notificationStatusEnum.enumValues)[number];

  @ApiProperty({
    example: 'booking-reminder-b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  dedupeKey!: string;

  @ApiPropertyOptional({
    example: '2026-04-20T08:30:00.000Z',
    format: 'date-time',
  })
  scheduledFor?: string | null;

  @ApiPropertyOptional({
    example: '2026-04-20T08:45:00.000Z',
    format: 'date-time',
  })
  deliveredAt?: string | null;

  @ApiProperty({
    example: '2026-04-20T08:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-20T08:30:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiProperty({
    type: () => NotificationDeliveryAttemptResponseDto,
    isArray: true,
  })
  attempts!: NotificationDeliveryAttemptResponseDto[];
}
