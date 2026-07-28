import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const customerVehicleTimelineSourceTypes = [
  'booking',
  'inspection',
  'job_order',
  'quality_gate',
  'insurance',
  'lifecycle_summary',
] as const;

export class ListCustomerVehicleTimelineQueryDto {
  @ApiPropertyOptional({
    enum: customerVehicleTimelineSourceTypes,
  })
  @IsOptional()
  @IsIn(customerVehicleTimelineSourceTypes)
  sourceType?: (typeof customerVehicleTimelineSourceTypes)[number];

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
