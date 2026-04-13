import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { bookingStatusEnum } from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: bookingStatusEnum.enumValues.filter((status) => status !== 'rescheduled'),
    example: 'confirmed',
    description: 'Next booking status. Use the reschedule endpoint for slot/date changes.',
  })
  @IsEnum(bookingStatusEnum.enumValues.filter((status) => status !== 'rescheduled'))
  status!: Exclude<BookingStatus, 'rescheduled'>;

  @ApiPropertyOptional({
    example: 'Approved by staff after checking slot availability.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
