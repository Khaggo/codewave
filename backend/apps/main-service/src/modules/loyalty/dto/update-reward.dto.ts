import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { rewardTypeEnum } from '../schemas/loyalty.schema';

export class UpdateRewardDto {
  @ApiPropertyOptional({
    example: 'Free wheel alignment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    example: 'Redeem for one complimentary wheel alignment service.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: rewardTypeEnum.enumValues,
    example: 'discount_coupon',
  })
  @IsOptional()
  @IsEnum(rewardTypeEnum.enumValues)
  rewardType?: (typeof rewardTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsCost?: number;

  @ApiPropertyOptional({
    example: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    example: 'Adjusted point cost after spring campaign review.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
