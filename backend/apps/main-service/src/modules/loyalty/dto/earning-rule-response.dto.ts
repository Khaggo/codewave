import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  earningRuleAccrualSourceEnum,
  earningRuleFormulaTypeEnum,
  earningRuleStatusEnum,
} from '../schemas/loyalty.schema';
import { EarningRuleAuditResponseDto } from './earning-rule-audit-response.dto';

export class EarningRuleResponseDto {
  @ApiProperty({
    example: 'e055e84f-bff5-4d0d-b8f2-46f145c8c92a',
  })
  id!: string;

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
    example: 'both',
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
    type: () => EarningRuleAuditResponseDto,
    isArray: true,
  })
  audits?: EarningRuleAuditResponseDto[];
}
