import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class BookingAvailabilityQueryDto {
  @ApiProperty({
    example: '2026-04-01',
    description: 'Inclusive start date for the requested booking-availability window in YYYY-MM-DD format.',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: '2026-04-30',
    description: 'Inclusive end date for the requested booking-availability window in YYYY-MM-DD format.',
  })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    description: 'Optional time-slot filter when the client wants availability for one slot definition only.',
  })
  @IsOptional()
  @IsString()
  timeSlotId?: string;
}
