import { ApiProperty } from '@nestjs/swagger';

import { BookingResponseDto } from './booking-response.dto';

export class DailyScheduleSlotViewDto {
  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  timeSlotId!: string;

  @ApiProperty({
    example: 'Morning Slot',
  })
  label!: string;

  @ApiProperty({
    example: 4,
  })
  totalCapacity!: number;

  @ApiProperty({
    example: 2,
  })
  confirmedCount!: number;

  @ApiProperty({
    example: 1,
  })
  inServiceCount!: number;

  @ApiProperty({
    example: 1,
  })
  pendingCount!: number;

  @ApiProperty({
    example: 1,
  })
  rescheduledCount!: number;

  @ApiProperty({
    type: () => BookingResponseDto,
    isArray: true,
  })
  bookings!: BookingResponseDto[];
}
