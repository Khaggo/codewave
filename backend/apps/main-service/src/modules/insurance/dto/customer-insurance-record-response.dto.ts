import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { insuranceInquiryStatusEnum, insuranceInquiryTypeEnum } from '../schemas/insurance.schema';

export class CustomerInsuranceRecordResponseDto {
  @ApiProperty({
    enum: insuranceInquiryTypeEnum.enumValues,
    example: 'comprehensive',
  })
  inquiryType!: (typeof insuranceInquiryTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Provider will be confirmed after the initial review.',
  })
  providerName?: string | null;

  @ApiPropertyOptional({
    example: 'POL-2026-00045',
  })
  policyNumber?: string | null;

  @ApiProperty({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'approved',
  })
  status!: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @ApiProperty({
    example: '2026-04-22T10:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-22T10:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
