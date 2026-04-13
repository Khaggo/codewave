import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferencesResponseDto {
  @ApiProperty({
    example: '99c2b1bc-e89d-4d55-b7eb-3e49c560a2c5',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: true,
  })
  emailEnabled!: boolean;

  @ApiProperty({
    example: true,
  })
  smsEnabled!: boolean;

  @ApiProperty({
    example: true,
  })
  bookingRemindersEnabled!: boolean;

  @ApiProperty({
    example: true,
  })
  insuranceUpdatesEnabled!: boolean;

  @ApiProperty({
    example: true,
  })
  invoiceRemindersEnabled!: boolean;

  @ApiProperty({
    example: true,
  })
  serviceFollowUpEnabled!: boolean;

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
}
