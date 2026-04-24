import { ApiProperty } from '@nestjs/swagger';

import { bookingAvailabilitySlotStatusValues } from '../bookings.constants';

export class BookingAvailabilitySlotViewDto {
  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  timeSlotId!: string;

  @ApiProperty({
    example: 'Morning Slot',
  })
  label!: string;

  @ApiProperty({
    example: '09:00',
  })
  startTime!: string;

  @ApiProperty({
    example: '10:00',
  })
  endTime!: string;

  @ApiProperty({
    example: 4,
  })
  capacity!: number;

  @ApiProperty({
    example: 2,
  })
  bookingCount!: number;

  @ApiProperty({
    example: 2,
  })
  remainingCapacity!: number;

  @ApiProperty({
    enum: bookingAvailabilitySlotStatusValues,
    example: 'available',
  })
  status!: (typeof bookingAvailabilitySlotStatusValues)[number];

  @ApiProperty({
    example: true,
  })
  isAvailable!: boolean;
}
