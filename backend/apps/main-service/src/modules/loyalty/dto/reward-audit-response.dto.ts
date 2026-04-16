import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { rewardCatalogAuditActionEnum, rewardStatusEnum, rewardTypeEnum } from '../schemas/loyalty.schema';

export class RewardCatalogSnapshotResponseDto {
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
}

export class RewardAuditResponseDto {
  @ApiProperty({
    example: '4d18cf50-617d-42de-9df4-d7cd2945ce7c',
  })
  id!: string;

  @ApiProperty({
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  rewardId!: string;

  @ApiProperty({
    example: 'super-admin-1',
  })
  actorUserId!: string;

  @ApiProperty({
    enum: rewardCatalogAuditActionEnum.enumValues,
    example: 'created',
  })
  action!: (typeof rewardCatalogAuditActionEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Initial catalog creation.',
  })
  reason?: string | null;

  @ApiProperty({
    type: () => RewardCatalogSnapshotResponseDto,
  })
  snapshot!: RewardCatalogSnapshotResponseDto;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
