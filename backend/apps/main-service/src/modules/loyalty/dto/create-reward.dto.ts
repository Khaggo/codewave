import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { rewardStatusEnum, rewardTypeEnum } from '../schemas/loyalty.schema';

export class CreateRewardDto {
  @ApiProperty({
    example: 'Free wheel alignment',
  })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'Redeem for one complimentary wheel alignment service.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Issue one promo sticker manually at cashier after redemption.',
  })
  @IsOptional()
  @IsString()
  fulfillmentNote?: string;

  @ApiProperty({
    enum: rewardTypeEnum.enumValues,
    example: 'service_voucher',
  })
  @IsEnum(rewardTypeEnum.enumValues)
  rewardType!: (typeof rewardTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 100,
  })
  @IsInt()
  @Min(1)
  pointsCost!: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Optional discount percentage when the reward is a discount coupon.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    enum: rewardStatusEnum.enumValues,
    example: 'active',
  })
  @IsOptional()
  @IsEnum(rewardStatusEnum.enumValues)
  status?: (typeof rewardStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Initial launch reward for service customers.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
