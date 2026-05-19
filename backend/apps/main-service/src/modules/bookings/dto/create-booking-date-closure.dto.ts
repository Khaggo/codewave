import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBookingDateClosureDto {
  @ApiProperty({
    example: '2026-12-25',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({
    example: 'Holiday closure',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiProperty({
    example: 'Shop is closed for the Christmas holiday.',
  })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Defaults to true so the date closes immediately.',
  })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
