import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ListInsuranceInquiriesQueryDto } from './list-insurance-inquiries-query.dto';

export const insuranceBroadcastTargetModeValues = [
  'selected_cases',
  'filtered_results',
] as const;

export type InsuranceBroadcastTargetMode = (typeof insuranceBroadcastTargetModeValues)[number];

export class SendInsuranceBroadcastsDto {
  @ApiProperty({
    enum: insuranceBroadcastTargetModeValues,
    example: 'selected_cases',
  })
  @IsEnum(insuranceBroadcastTargetModeValues)
  targetMode!: InsuranceBroadcastTargetMode;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['4c559c0b-4d1b-492f-a11f-e61271f4a32d'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedIds?: string[];

  @ApiPropertyOptional({
    type: () => ListInsuranceInquiriesQueryDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListInsuranceInquiriesQueryDto)
  filters?: ListInsuranceInquiriesQueryDto;

  @ApiProperty({
    example: 'Insurance processing update',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    example: 'Please review your insurance request in the app for the latest update.',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  message!: string;
}
