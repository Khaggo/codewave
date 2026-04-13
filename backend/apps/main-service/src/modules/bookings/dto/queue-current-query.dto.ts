import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueueCurrentQueryDto {
  @ApiPropertyOptional({
    example: '2026-04-20',
    description: 'Optional queue date in YYYY-MM-DD format. Defaults to today when omitted.',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    description: 'Optional time-slot filter for queue visibility.',
  })
  @IsOptional()
  @IsString()
  timeSlotId?: string;
}
