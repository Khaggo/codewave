import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { bookingStatusEnum } from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export class BookingStatusHistoryResponseDto {
  @ApiProperty({
    example: '9759fe0a-f2db-4728-99c0-fd4b1e170733',
  })
  id!: string;

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  bookingId!: string;

  @ApiPropertyOptional({
    enum: bookingStatusEnum.enumValues,
    example: 'pending',
  })
  previousStatus?: BookingStatus | null;

  @ApiProperty({
    enum: bookingStatusEnum.enumValues,
    example: 'confirmed',
  })
  nextStatus!: BookingStatus;

  @ApiPropertyOptional({
    example: 'Customer confirmed by staff after phone verification.',
  })
  reason?: string | null;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  changedByUserId?: string | null;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  changedAt!: string;
}
