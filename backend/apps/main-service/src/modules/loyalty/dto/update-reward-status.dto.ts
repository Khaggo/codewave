import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

import { rewardStatusEnum } from '../schemas/loyalty.schema';

export class UpdateRewardStatusDto {
  @ApiProperty({
    enum: rewardStatusEnum.enumValues,
    example: 'inactive',
  })
  @IsEnum(rewardStatusEnum.enumValues)
  status!: (typeof rewardStatusEnum.enumValues)[number];

  @ApiProperty({
    example: 'Temporarily disabled while inventory-backed redemption rules are reviewed.',
  })
  @IsString()
  reason!: string;
}
