import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
