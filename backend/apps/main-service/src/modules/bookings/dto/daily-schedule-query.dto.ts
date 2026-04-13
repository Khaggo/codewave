import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { bookingStatusEnum } from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export class DailyScheduleQueryDto {
  @ApiProperty({
    example: '2026-04-20',
    description: 'Schedule date in YYYY-MM-DD format.',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    description: 'Optional time-slot filter.',
  })
  @IsOptional()
  @IsString()
  timeSlotId?: string;

  @ApiPropertyOptional({
    enum: bookingStatusEnum.enumValues,
    example: 'confirmed',
    description: 'Optional booking-status filter for the schedule view.',
  })
  @IsOptional()
  @IsEnum(bookingStatusEnum.enumValues)
  status?: BookingStatus;
}
