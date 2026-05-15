import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { ListInsuranceInquiriesQueryDto } from './list-insurance-inquiries-query.dto';

export const insuranceManualReminderTypeValues = [
  'missing_documents',
  'payment_pending',
  'overdue_payment',
  'renewal_follow_up',
] as const;

export const insuranceReminderTargetModeValues = [
  'single_case',
  'selected_cases',
  'filtered_results',
] as const;

export type InsuranceManualReminderType = (typeof insuranceManualReminderTypeValues)[number];
export type InsuranceReminderTargetMode = (typeof insuranceReminderTargetModeValues)[number];

export class SendInsuranceRemindersDto {
  @ApiProperty({
    enum: insuranceManualReminderTypeValues,
    example: 'missing_documents',
  })
  @IsEnum(insuranceManualReminderTypeValues)
  reminderType!: InsuranceManualReminderType;

  @ApiProperty({
    enum: insuranceReminderTargetModeValues,
    example: 'single_case',
  })
  @IsEnum(insuranceReminderTargetModeValues)
  targetMode!: InsuranceReminderTargetMode;

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
}
