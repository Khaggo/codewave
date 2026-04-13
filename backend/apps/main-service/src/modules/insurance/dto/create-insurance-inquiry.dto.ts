import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { insuranceInquiryTypeEnum } from '../schemas/insurance.schema';

export class CreateInsuranceInquiryDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    description: 'Customer user id that owns the insurance workflow.',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
    description: 'Vehicle tied to the insurance concern.',
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
    example: 'Accident repair inquiry',
    maxLength: 180,
  })
  @IsString()
  @MaxLength(180)
  subject!: string;

  @ApiProperty({
    example: 'Customer reported front-bumper and headlight damage after a collision.',
  })
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    example: 'Provider will be confirmed after the initial review.',
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
    example: 'Customer will upload the OR/CR and policy copy later today.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
