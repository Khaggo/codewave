import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    description: 'Customer user id that owns the booking.',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
    description: 'Vehicle id selected for the appointment.',
  })
  @IsString()
  vehicleId!: string;

  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    description: 'Selected appointment slot id.',
  })
  @IsString()
  timeSlotId!: string;

  @ApiProperty({
    example: '2026-04-20',
    description: 'Date of the requested appointment in YYYY-MM-DD format.',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0'],
    description: 'Requested service ids to attach to the booking.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  serviceIds!: string[];

  @ApiPropertyOptional({
    example: 'Please check the air filter as well.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
