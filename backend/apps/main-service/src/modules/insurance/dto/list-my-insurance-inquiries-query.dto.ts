import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { insuranceInquiryStatusEnum } from '../schemas/insurance.schema';

export class ListMyInsuranceInquiriesQueryDto {
  @ApiPropertyOptional({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({
    enum: insuranceInquiryStatusEnum.enumValues,
    example: 'under_review',
  })
  @IsOptional()
  @IsEnum(insuranceInquiryStatusEnum.enumValues)
  status?: (typeof insuranceInquiryStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opaque versioned keyset cursor returned by the previous page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
