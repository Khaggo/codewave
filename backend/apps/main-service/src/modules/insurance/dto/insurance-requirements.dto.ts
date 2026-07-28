import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import {
  insuranceCasePurposeEnum,
  insuranceDocumentTypeEnum,
  insuranceInquiryTypeEnum,
} from '../schemas/insurance.schema';

export class InsuranceRequirementsQueryDto {
  @ApiProperty({
    enum: insuranceCasePurposeEnum.enumValues,
    example: 'renewal',
  })
  @IsEnum(insuranceCasePurposeEnum.enumValues)
  purpose!: (typeof insuranceCasePurposeEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insuranceInquiryTypeEnum.enumValues,
    example: 'comprehensive',
  })
  @IsOptional()
  @IsEnum(insuranceInquiryTypeEnum.enumValues)
  inquiryType?: (typeof insuranceInquiryTypeEnum.enumValues)[number];
}

export class InsuranceRequirementsResponseDto {
  @ApiProperty({
    enum: insuranceCasePurposeEnum.enumValues,
    example: 'renewal',
  })
  purpose!: (typeof insuranceCasePurposeEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insuranceInquiryTypeEnum.enumValues,
    example: 'comprehensive',
  })
  inquiryType?: (typeof insuranceInquiryTypeEnum.enumValues)[number];

  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    isArray: true,
    example: ['or_cr', 'policy'],
  })
  requiredDocumentTypes!: Array<(typeof insuranceDocumentTypeEnum.enumValues)[number]>;

  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    isArray: true,
    example: ['valid_id', 'police_report', 'photo', 'estimate', 'proof_of_payment', 'other'],
  })
  optionalDocumentTypes!: Array<(typeof insuranceDocumentTypeEnum.enumValues)[number]>;
}
