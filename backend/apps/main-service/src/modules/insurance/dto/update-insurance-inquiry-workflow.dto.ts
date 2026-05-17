import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import {
  insuranceDocumentReviewStatusEnum,
  insuranceInquiryStatusEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
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
}
