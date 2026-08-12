import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import {
  insuranceDocumentReviewStatusEnum,
  insuranceInquiryStatusEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
  insuranceDocumentTypeEnum,
} from '../schemas/insurance.schema';

export class UpdateInsuranceInquiryWorkflowDto {
  @ApiProperty({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'payment_pending',
  })
  @IsEnum(insuranceInquiryStatusEnum.enumValues)
  status!: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insuranceDocumentReviewStatusEnum.enumValues,
    example: 'complete',
  })
  @IsOptional()
  @IsEnum(insuranceDocumentReviewStatusEnum.enumValues)
  documentStatus?: (typeof insuranceDocumentReviewStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insurancePaymentStatusEnum.enumValues,
    example: 'proof_submitted',
  })
  @IsOptional()
  @IsEnum(insurancePaymentStatusEnum.enumValues)
  paymentStatus?: (typeof insurancePaymentStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insuranceRenewalStatusEnum.enumValues,
    example: 'upcoming',
  })
  @IsOptional()
  @IsEnum(insuranceRenewalStatusEnum.enumValues)
  renewalStatus?: (typeof insuranceRenewalStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: '2026-05-30T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  paymentDueAt?: string;

  @ApiPropertyOptional({
    example: '2026-08-15T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  policyExpiryAt?: string;

  @ApiPropertyOptional({
    example: '2026-07-15T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  renewalDueAt?: string;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @IsOptional()
  @IsUUID()
  assignedStaffId?: string;

  @ApiPropertyOptional({
    example: 'Waiting for proof of payment validation.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    example: 'Your renewal quote is ready for review.',
    maxLength: 1000,
    description: 'Optional update explicitly approved for customer visibility.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerMessage?: string;

  @ApiPropertyOptional({
    enum: insuranceDocumentTypeEnum.enumValues,
    isArray: true,
    description: 'Allowlisted document types requested from the customer during review.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(insuranceDocumentTypeEnum.enumValues, { each: true })
  requestedDocumentTypes?: Array<(typeof insuranceDocumentTypeEnum.enumValues)[number]>;

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded insurance inquiry detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
