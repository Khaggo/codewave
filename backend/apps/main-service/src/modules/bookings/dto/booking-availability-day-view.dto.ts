import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { bookingAvailabilityDayStatusValues } from '../bookings.constants';
import { BookingAvailabilitySlotViewDto } from './booking-availability-slot-view.dto';

export class BookingAvailabilityDayViewDto {
  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    enum: bookingAvailabilityDayStatusValues,
    example: 'limited',
  })
  status!: (typeof bookingAvailabilityDayStatusValues)[number];

  @ApiPropertyOptional({
    example: 'Holiday closure',
    nullable: true,
  })
  closureLabel?: string | null;

  @ApiPropertyOptional({
    example: 'Shop is closed for the Christmas holiday.',
    nullable: true,
  })
  closureReason?: string | null;

  @ApiProperty({
    example: true,
  })
  isBookable!: boolean;

  @ApiProperty({
    example: 2,
  })
  activeSlotCount!: number;

  @ApiProperty({
    example: 1,
  })
  availableSlotCount!: number;

  @ApiProperty({
    example: 5,
  })
  totalCapacity!: number;

  @ApiProperty({
    example: 2,
  })
  remainingCapacity!: number;

  @ApiProperty({
    type: () => BookingAvailabilitySlotViewDto,
    isArray: true,
  })
  slots!: BookingAvailabilitySlotViewDto[];
}
