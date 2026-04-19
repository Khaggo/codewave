import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTimeSlotDto {
  @ApiProperty({
    example: 'Morning Service',
  })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiProperty({
    example: '09:30',
  })
  @Matches(TIME_PATTERN, {
    message: 'startTime must use HH:mm 24-hour format',
  })
  startTime!: string;

  @ApiProperty({
    example: '11:00',
  })
  @Matches(TIME_PATTERN, {
    message: 'endTime must use HH:mm 24-hour format',
  })
  endTime!: string;

  @ApiProperty({
    example: 4,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  capacity!: number;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
