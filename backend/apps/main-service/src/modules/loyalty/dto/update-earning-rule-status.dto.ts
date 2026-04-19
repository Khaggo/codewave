import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { earningRuleStatusEnum } from '../schemas/loyalty.schema';

export class UpdateEarningRuleStatusDto {
  @ApiProperty({
    enum: earningRuleStatusEnum.enumValues,
    example: 'inactive',
  })
  @IsEnum(earningRuleStatusEnum.enumValues)
  status!: (typeof earningRuleStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Promo window ended.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
