import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  earningRuleAccrualSourceEnum,
  earningRuleAuditActionEnum,
  earningRuleFormulaTypeEnum,
  earningRuleStatusEnum,
} from '../schemas/loyalty.schema';

export class EarningRuleSnapshotResponseDto {
  @ApiProperty({
    example: 'Paid collision repair points',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Earn points after paid collision repair orders are settled.',
  })
  description?: string | null;

  @ApiProperty({
    enum: earningRuleAccrualSourceEnum.enumValues,
    example: 'service',
  })
  accrualSource!: (typeof earningRuleAccrualSourceEnum.enumValues)[number];

  @ApiProperty({
    enum: earningRuleFormulaTypeEnum.enumValues,
    example: 'amount_ratio',
  })
  formulaType!: (typeof earningRuleFormulaTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  flatPoints!: number | null;

  @ApiPropertyOptional({
    example: 5000,
    nullable: true,
  })
  amountStepCents!: number | null;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
  })
  pointsPerStep!: number | null;

  @ApiPropertyOptional({
    example: 100000,
    nullable: true,
  })
  minimumAmountCents!: number | null;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  eligibleServiceTypes!: string[];

  @ApiProperty({
    type: String,
    isArray: true,
  })
  eligibleServiceCategories!: string[];

  @ApiProperty({
    type: String,
    isArray: true,
  })
  eligibleProductIds!: string[];

  @ApiProperty({
    type: String,
    isArray: true,
  })
  eligibleProductCategoryIds!: string[];

  @ApiPropertyOptional({
    example: 'Collision Week Bonus',
    nullable: true,
  })
  promoLabel!: string | null;

  @ApiPropertyOptional({
    example: 'Issue one windshield sticker manually upon successful point accrual.',
    nullable: true,
  })
  manualBenefitNote!: string | null;

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  activeFrom!: string | null;

  @ApiPropertyOptional({
    example: '2026-05-31T23:59:59.000Z',
    format: 'date-time',
    nullable: true,
  })
  activeUntil!: string | null;

  @ApiProperty({
    enum: earningRuleStatusEnum.enumValues,
    example: 'active',
  })
  status!: (typeof earningRuleStatusEnum.enumValues)[number];
}

export class EarningRuleAuditResponseDto {
  @ApiProperty({
    example: '58bb25b9-8a10-4146-a975-7b8d90044534',
  })
  id!: string;

  @ApiProperty({
    example: 'e055e84f-bff5-4d0d-b8f2-46f145c8c92a',
  })
  earningRuleId!: string;

  @ApiProperty({
    example: 'super-admin-1',
  })
  actorUserId!: string;

  @ApiProperty({
    enum: earningRuleAuditActionEnum.enumValues,
    example: 'created',
  })
  action!: (typeof earningRuleAuditActionEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Promo launched.',
  })
  reason?: string | null;

  @ApiProperty({
    type: () => EarningRuleSnapshotResponseDto,
  })
  snapshot!: EarningRuleSnapshotResponseDto;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
