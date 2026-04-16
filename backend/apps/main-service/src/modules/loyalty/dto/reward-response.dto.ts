import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { rewardStatusEnum, rewardTypeEnum } from '../schemas/loyalty.schema';
import { RewardAuditResponseDto } from './reward-audit-response.dto';

export class RewardResponseDto {
  @ApiProperty({
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  id!: string;

  @ApiProperty({
    example: 'Free wheel alignment',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Redeem for one complimentary wheel alignment service.',
  })
  description?: string | null;

  @ApiProperty({
    enum: rewardTypeEnum.enumValues,
    example: 'service_voucher',
  })
  rewardType!: (typeof rewardTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 100,
  })
  pointsCost!: number;

  @ApiPropertyOptional({
    example: 20,
  })
  discountPercent?: number | null;

  @ApiProperty({
    enum: rewardStatusEnum.enumValues,
    example: 'active',
  })
  status!: (typeof rewardStatusEnum.enumValues)[number];

  @ApiProperty({
    example: 'super-admin-1',
  })
  createdByUserId!: string;

  @ApiPropertyOptional({
    example: 'super-admin-1',
  })
  updatedByUserId?: string | null;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-14T09:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: () => RewardAuditResponseDto,
    isArray: true,
  })
  audits?: RewardAuditResponseDto[];
}
