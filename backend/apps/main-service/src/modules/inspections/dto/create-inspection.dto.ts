import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { inspectionStatusEnum, inspectionTypeEnum } from '../schemas/inspections.schema';

import { CreateInspectionFindingDto } from './create-inspection-finding.dto';

type InspectionStatus = (typeof inspectionStatusEnum.enumValues)[number];
type InspectionType = (typeof inspectionTypeEnum.enumValues)[number];

export class CreateInspectionDto {
  @ApiProperty({
    enum: inspectionTypeEnum.enumValues,
    example: 'intake',
    description: 'Operational checkpoint for the inspection record.',
  })
  @IsEnum(inspectionTypeEnum.enumValues)
  inspectionType!: InspectionType;

  @ApiPropertyOptional({
    enum: inspectionStatusEnum.enumValues,
    example: 'completed',
    description: 'Inspection status. Defaults to completed when omitted.',
  })
  @IsOptional()
  @IsEnum(inspectionStatusEnum.enumValues)
  status?: InspectionStatus;

  @ApiPropertyOptional({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
    description: 'Optional booking reference when the inspection is tied to a booking visit.',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    description: 'Optional inspector identity reference.',
  })
  @IsOptional()
  @IsString()
  inspectorUserId?: string;

  @ApiPropertyOptional({
    example: 'Initial intake inspection before service work begins.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['upload://vehicle/photo-1', 'upload://vehicle/photo-2'],
    description: 'Attachment references only. Upload handling remains out of scope for v1.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  attachmentRefs?: string[];

  @ApiPropertyOptional({
    type: () => CreateInspectionFindingDto,
    isArray: true,
    description: 'Structured findings captured during the inspection.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionFindingDto)
  findings?: CreateInspectionFindingDto[];
}
