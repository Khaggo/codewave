import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { jobOrderProgressEntryTypeEnum } from '../schemas/job-orders.schema';

export class AddJobOrderProgressDto {
  @ApiProperty({
    enum: jobOrderProgressEntryTypeEnum.enumValues,
    example: 'work_started',
  })
  @IsEnum(jobOrderProgressEntryTypeEnum.enumValues)
  entryType!: (typeof jobOrderProgressEntryTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'Started diagnostics on the front suspension and mounting points.',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['8bcb97fe-0aa4-4c68-ae49-2f58c4526529'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  completedItemIds?: string[];

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
