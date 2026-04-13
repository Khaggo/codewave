import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { inspectionFindingSeverityEnum } from '../schemas/inspections.schema';

type InspectionFindingSeverity = (typeof inspectionFindingSeverityEnum.enumValues)[number];

export class CreateInspectionFindingDto {
  @ApiProperty({
    example: 'body',
    maxLength: 120,
    description: 'High-level grouping for the finding.',
  })
  @IsString()
  @MaxLength(120)
  category!: string;

  @ApiProperty({
    example: 'Front bumper scratches',
    maxLength: 160,
    description: 'Short finding label for quick review.',
  })
  @IsString()
  @MaxLength(160)
  label!: string;

  @ApiPropertyOptional({
    enum: inspectionFindingSeverityEnum.enumValues,
    example: 'medium',
  })
  @IsOptional()
  @IsEnum(inspectionFindingSeverityEnum.enumValues)
  severity?: InspectionFindingSeverity;

  @ApiPropertyOptional({
    example: 'Visible scratch marks on the lower right side.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Marks whether the finding was already verified by the inspector.',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
