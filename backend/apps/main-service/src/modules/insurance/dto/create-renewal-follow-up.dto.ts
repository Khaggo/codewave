import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { insuranceInquiryTypeEnum } from '../schemas/insurance.schema';

export class CreateRenewalFollowUpDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    description: 'Customer user id that owns the renewal follow-up.',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
    description: 'Vehicle tied to the renewal follow-up.',
  })
  @IsString()
  vehicleId!: string;

  @ApiProperty({
    enum: insuranceInquiryTypeEnum.enumValues,
    example: 'comprehensive',
  })
  @IsEnum(insuranceInquiryTypeEnum.enumValues)
  inquiryType!: (typeof insuranceInquiryTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'Renewal due next month',
    maxLength: 180,
  })
  @IsString()
  @MaxLength(180)
  subject!: string;

  @ApiProperty({
    example: 'Customer should receive a renewal quote before the current policy expires.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    example: '2026-06-15T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  renewalDueAt!: string;

  @ApiPropertyOptional({
    example: '2026-06-20T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  policyExpiryAt?: string;

  @ApiPropertyOptional({
    example: 'Provider will be confirmed during the renewal call.',
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  providerName?: string;

  @ApiPropertyOptional({
    example: 'POL-2026-00045',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  policyNumber?: string;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;

  @ApiPropertyOptional({
    example: 'Customer prefers a morning follow-up call.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
