import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { insuranceInquiryStatusEnum, insuranceInquiryTypeEnum } from '../schemas/insurance.schema';

export class InsuranceRecordResponseDto {
  @ApiProperty({
    example: '32f69cef-20a1-4137-8f8f-86d2d1791f25',
  })
  id!: string;

  @ApiProperty({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  inquiryId!: string;

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
    example: 'approved_for_record',
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
