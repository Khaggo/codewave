import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { jobOrderWorkshopStageEnum } from '../schemas/job-orders.schema';

export class UpdateJobOrderWorkshopStageDto {
  @ApiProperty({
    enum: jobOrderWorkshopStageEnum.enumValues,
    example: 'diagnosis',
  })
  @IsEnum(jobOrderWorkshopStageEnum.enumValues)
  stage!: (typeof jobOrderWorkshopStageEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Adviser confirmed the complaint and started diagnostics.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({
    example: '2026-05-22T10:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
