import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from '../schemas/loyalty.schema';

export class UpdateEarningRuleDto {
  @ApiPropertyOptional({
    example: 'Paid collision repair points',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    example: 'Earn points after paid collision repair orders are settled.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: earningRuleAccrualSourceEnum.enumValues,
    example: 'ecommerce',
  })
  @IsOptional()
  @IsEnum(earningRuleAccrualSourceEnum.enumValues)
  accrualSource?: (typeof earningRuleAccrualSourceEnum.enumValues)[number];

  @ApiPropertyOptional({
    enum: earningRuleFormulaTypeEnum.enumValues,
    example: 'flat_points',
  })
  @IsOptional()
  @IsEnum(earningRuleFormulaTypeEnum.enumValues)
  formulaType?: (typeof earningRuleFormulaTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 100,
  })
  @ValidateIf((dto) => dto.flatPoints !== undefined)
  @IsInt()
  @Min(1)
  flatPoints?: number | null;

  @ApiPropertyOptional({
    example: 5000,
  })
  @ValidateIf((dto) => dto.amountStepCents !== undefined)
  @IsInt()
  @Min(1)
  amountStepCents?: number | null;

  @ApiPropertyOptional({
    example: 1,
  })
  @ValidateIf((dto) => dto.pointsPerStep !== undefined)
  @IsInt()
  @Min(1)
  pointsPerStep?: number | null;

  @ApiPropertyOptional({
    example: 100000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAmountCents?: number | null;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['collision_repair'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  eligibleServiceTypes?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['repair'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  eligibleServiceCategories?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['product-1'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  eligibleProductIds?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['category-1'],
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
  promoLabel?: string | null;

  @ApiPropertyOptional({
    example: 'Issue one windshield sticker manually upon successful point accrual.',
  })
  @IsOptional()
  @IsString()
  manualBenefitNote?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  activeFrom?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  activeUntil?: string | null;

  @ApiPropertyOptional({
    example: 'Adjusted after promo review.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
