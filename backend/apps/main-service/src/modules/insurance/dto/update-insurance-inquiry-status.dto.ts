import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { insuranceInquiryStatusEnum } from '../schemas/insurance.schema';

export class UpdateInsuranceInquiryStatusDto {
  @ApiProperty({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'under_review',
  })
  @IsEnum(insuranceInquiryStatusEnum.enumValues)
  status!: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Awaiting the customer policy copy before final approval.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    example: 'We are reviewing your submitted documents. No action is needed right now.',
    maxLength: 1000,
    description: 'Optional update explicitly approved for customer visibility.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerMessage?: string;

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded insurance inquiry detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
