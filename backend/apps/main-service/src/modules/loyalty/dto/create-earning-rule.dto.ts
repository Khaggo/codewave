import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  earningRuleAccrualSourceEnum,
  earningRuleFormulaTypeEnum,
  earningRuleStatusEnum,
} from '../schemas/loyalty.schema';

export class CreateEarningRuleDto {
  @ApiProperty({
    example: 'Paid collision repair points',
  })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'Earn points after paid collision repair orders are settled.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: earningRuleAccrualSourceEnum.enumValues,
    example: 'service',
  })
  @IsEnum(earningRuleAccrualSourceEnum.enumValues)
  accrualSource!: (typeof earningRuleAccrualSourceEnum.enumValues)[number];

  @ApiProperty({
    enum: earningRuleFormulaTypeEnum.enumValues,
    example: 'amount_ratio',
  })
  @IsEnum(earningRuleFormulaTypeEnum.enumValues)
  formulaType!: (typeof earningRuleFormulaTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 100,
    description: 'Required when formulaType is flat_points.',
  })
  @ValidateIf((dto) => dto.formulaType === 'flat_points' || dto.flatPoints !== undefined)
  @IsInt()
  @Min(1)
  flatPoints?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Required when formulaType is amount_ratio. Represents the paid-amount step in cents.',
  })
  @ValidateIf((dto) => dto.formulaType === 'amount_ratio' || dto.amountStepCents !== undefined)
  @IsInt()
  @Min(1)
  amountStepCents?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Required when formulaType is amount_ratio. Represents points awarded per amount step.',
  })
  @ValidateIf((dto) => dto.formulaType === 'amount_ratio' || dto.pointsPerStep !== undefined)
  @IsInt()
  @Min(1)
  pointsPerStep?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Optional minimum settled amount in cents before the rule can apply.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAmountCents?: number;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['collision_repair', 'body_work'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  eligibleServiceTypes?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['repair', 'insurance_claim'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  eligibleServiceCategories?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['product-1', 'product-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  eligibleProductIds?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['category-1', 'category-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  eligibleProductCategoryIds?: string[];

  @ApiPropertyOptional({
    example: 'Collision Week Bonus',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  promoLabel?: string;

  @ApiPropertyOptional({
    example: 'Issue one windshield sticker manually upon successful point accrual.',
  })
  @IsOptional()
  @IsString()
  manualBenefitNote?: string;

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  activeFrom?: string;

  @ApiPropertyOptional({
    example: '2026-05-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  activeUntil?: string;

  @ApiPropertyOptional({
    enum: earningRuleStatusEnum.enumValues,
    example: 'active',
  })
  @IsOptional()
  @IsEnum(earningRuleStatusEnum.enumValues)
  status?: (typeof earningRuleStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Spring workshop promo launch.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
