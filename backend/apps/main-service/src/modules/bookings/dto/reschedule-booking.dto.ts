import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    description: 'Replacement time slot id.',
  })
  @IsString()
  timeSlotId!: string;

  @ApiProperty({
    example: '2026-04-21',
    description: 'Replacement appointment date in YYYY-MM-DD format.',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({
    example: 'Customer requested a later slot.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
