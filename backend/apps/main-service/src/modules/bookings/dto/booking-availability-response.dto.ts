import { ApiProperty } from '@nestjs/swagger';

import { BookingAvailabilityDayViewDto } from './booking-availability-day-view.dto';

export class BookingAvailabilityResponseDto {
  @ApiProperty({
    example: '2026-04-01T00:00:00.000Z',
    format: 'date-time',
  })
  generatedAt!: string;

  @ApiProperty({
    example: '2026-04-01',
  })
  startDate!: string;

  @ApiProperty({
    example: '2026-04-30',
  })
  endDate!: string;

  @ApiProperty({
    example: '2026-04-02',
  })
  minBookableDate!: string;

  @ApiProperty({
    example: '2026-09-28',
  })
  maxBookableDate!: string;

  @ApiProperty({
    type: () => BookingAvailabilityDayViewDto,
    isArray: true,
  })
  days!: BookingAvailabilityDayViewDto[];
}
