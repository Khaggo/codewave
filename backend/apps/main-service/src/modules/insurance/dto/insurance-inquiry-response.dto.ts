import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  insuranceCasePurposeEnum,
  insuranceDocumentReviewStatusEnum,
  insuranceInquiryStatusEnum,
  insuranceInquiryTypeEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
} from '../schemas/insurance.schema';

import { InsuranceDocumentResponseDto } from './insurance-document-response.dto';

export class InsuranceInquiryResponseDto {
  @ApiProperty({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    enum: insuranceInquiryTypeEnum.enumValues,
    example: 'comprehensive',
  })
  inquiryType!: (typeof insuranceInquiryTypeEnum.enumValues)[number];

  @ApiProperty({
    enum: insuranceCasePurposeEnum.enumValues,
    example: 'quotation',
  })
  purpose!: (typeof insuranceCasePurposeEnum.enumValues)[number];

  @ApiProperty({
    example: 'Accident repair inquiry',
  })
  subject!: string;

  @ApiProperty({
    example: 'Customer reported front-bumper and headlight damage after a collision.',
  })
  description!: string;

  @ApiPropertyOptional({
    example: 'Provider will be confirmed after the initial review.',
  })
  providerName?: string | null;

  @ApiPropertyOptional({
    example: 'POL-2026-00045',
  })
  policyNumber?: string | null;

  @ApiPropertyOptional({
    example: 'Customer will upload the OR/CR and policy copy later today.',
  })
  notes?: string | null;

  @ApiProperty({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'submitted',
  })
  status!: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @ApiProperty({
    enum: insuranceDocumentReviewStatusEnum.enumValues,
    example: 'incomplete',
  })
  documentStatus!: (typeof insuranceDocumentReviewStatusEnum.enumValues)[number];

  @ApiProperty({
    enum: insurancePaymentStatusEnum.enumValues,
    example: 'not_required',
  })
  paymentStatus!: (typeof insurancePaymentStatusEnum.enumValues)[number];

  @ApiProperty({
    enum: insuranceRenewalStatusEnum.enumValues,
    example: 'not_applicable',
  })
  renewalStatus!: (typeof insuranceRenewalStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Awaiting uploaded policy copy before approval.',
  })
  reviewNotes?: string | null;

  @ApiPropertyOptional({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d099',
  })
  assignedStaffId?: string | null;

  @ApiProperty({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  })
  createdByUserId!: string;

  @ApiPropertyOptional({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  })
  reviewedByUserId?: string | null;

  @ApiPropertyOptional({
    example: '2026-04-22T10:00:00.000Z',
    format: 'date-time',
  })
  reviewedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-30T00:00:00.000Z',
    format: 'date-time',
  })
  paymentDueAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-15T00:00:00.000Z',
    format: 'date-time',
  })
  policyExpiryAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-07-15T00:00:00.000Z',
    format: 'date-time',
  })
  renewalDueAt?: string | null;

  @ApiProperty({
    type: () => InsuranceDocumentResponseDto,
    isArray: true,
  })
  documents!: InsuranceDocumentResponseDto[];

  @ApiProperty({
    example: '2026-04-22T09:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-22T09:30:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
