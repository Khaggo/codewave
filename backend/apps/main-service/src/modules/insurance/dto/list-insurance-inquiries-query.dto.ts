import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import {
  insuranceCasePurposeEnum,
  insuranceInquiryStatusEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
} from '../schemas/insurance.schema';

export class ListInsuranceInquiriesQueryDto {
  @ApiPropertyOptional({
    enum: insuranceCasePurposeEnum.enumValues,
    example: 'renewal',
  })
  @IsOptional()
  @IsEnum(insuranceCasePurposeEnum.enumValues)
  purpose?: (typeof insuranceCasePurposeEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'payment_pending',
  })
  @IsOptional()
  @IsEnum(insuranceInquiryStatusEnum.enumValues)
  status?: (typeof insuranceInquiryStatusEnum.enumValues)[number];

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
}
