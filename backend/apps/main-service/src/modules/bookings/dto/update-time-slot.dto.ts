import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({
    example: 'Morning Service',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    example: '09:30',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, {
    message: 'startTime must use HH:mm 24-hour format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    example: '11:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, {
    message: 'endTime must use HH:mm 24-hour format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  capacity?: number;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
