import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { backJobFindingSeverityEnum } from '../schemas/back-jobs.schema';

type BackJobFindingSeverity = (typeof backJobFindingSeverityEnum.enumValues)[number];

export class CreateBackJobFindingDto {
  @ApiProperty({
    example: 'engine',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  category!: string;

  @ApiProperty({
    example: 'Oil leak persisted after previous repair',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  label!: string;

  @ApiPropertyOptional({
    enum: backJobFindingSeverityEnum.enumValues,
    example: 'high',
  })
  @IsOptional()
  @IsEnum(backJobFindingSeverityEnum.enumValues)
  severity?: BackJobFindingSeverity;

  @ApiPropertyOptional({
    example: 'Leak remains visible around the valve cover area.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isValidated?: boolean;
}
