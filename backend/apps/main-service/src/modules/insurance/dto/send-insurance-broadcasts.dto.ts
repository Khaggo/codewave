import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsDefined,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { ListInsuranceInquiriesQueryDto } from './list-insurance-inquiries-query.dto';

export const insuranceBroadcastTargetModeValues = [
  'selected_cases',
  'filtered_results',
] as const;

export type InsuranceBroadcastTargetMode = (typeof insuranceBroadcastTargetModeValues)[number];

const insuranceBroadcastFilterKeys = ['purpose', 'status', 'paymentStatus', 'renewalStatus'] as const;

@ValidatorConstraint({ name: 'insuranceBroadcastFilters', async: false })
class InsuranceBroadcastFiltersConstraint implements ValidatorConstraintInterface {
  validate(filters: unknown, validationArguments: ValidationArguments) {
    const dto = validationArguments.object as SendInsuranceBroadcastsDto;

    if (dto.targetMode !== 'filtered_results') {
      return true;
    }

    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
      return false;
    }

    return insuranceBroadcastFilterKeys.some((key) => {
      const value = (filters as Partial<ListInsuranceInquiriesQueryDto>)[key];
      return value !== undefined && value !== null;
    });
  }

  defaultMessage() {
    return 'filtered_results broadcasts require at least one filter field';
  }
}

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
  @ValidateIf((value: SendInsuranceBroadcastsDto) => value.targetMode === 'selected_cases')
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  selectedIds?: string[];

  @ApiPropertyOptional({
    type: () => ListInsuranceInquiriesQueryDto,
  })
  @ValidateIf((value: SendInsuranceBroadcastsDto) => value.targetMode === 'filtered_results')
  @IsDefined()
  @ValidateNested()
  @Type(() => ListInsuranceInquiriesQueryDto)
  @Validate(InsuranceBroadcastFiltersConstraint)
  filters?: ListInsuranceInquiriesQueryDto;

  @ApiProperty({
    example: 'Insurance processing update',
    maxLength: 120,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    example: 'Please review your insurance request in the app for the latest update.',
    maxLength: 1000,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
