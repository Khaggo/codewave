import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { jobOrderStatusEnum } from '../schemas/job-orders.schema';

export class UpdateJobOrderStatusDto {
  @ApiProperty({
    enum: jobOrderStatusEnum.enumValues,
    example: 'in_progress',
  })
  @IsEnum(jobOrderStatusEnum.enumValues)
  status!: (typeof jobOrderStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Technician has started the assigned work items.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
