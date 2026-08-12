import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

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

  @ApiPropertyOptional({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
    description: 'Optional inquiry whose customer-visible document requests should be included.',
  })
  @IsOptional()
  @IsUUID()
  inquiryId?: string;
}

export class InsuranceDocumentRequirementResponseDto {
  @ApiProperty({ enum: insuranceDocumentTypeEnum.enumValues, example: 'police_report' })
  documentType!: (typeof insuranceDocumentTypeEnum.enumValues)[number];

  @ApiProperty({ example: 1 })
  minimumCount!: number;

  @ApiProperty({ example: true })
  required!: boolean;

  @ApiProperty({ example: true })
  conditional!: boolean;

  @ApiProperty({ example: false })
  requested!: boolean;
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

  @ApiProperty({ type: InsuranceDocumentRequirementResponseDto, isArray: true })
  documentRequirements!: InsuranceDocumentRequirementResponseDto[];

  @ApiProperty({ example: [] })
  requestedDocumentTypes!: Array<(typeof insuranceDocumentTypeEnum.enumValues)[number]>;

  @ApiProperty({ example: { or_cr: 1, valid_id: 1, policy: 1, photo: 0 } })
  minimumDocumentCounts!: Record<string, number>;
}
