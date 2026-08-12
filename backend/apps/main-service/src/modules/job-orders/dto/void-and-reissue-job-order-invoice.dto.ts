import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { jobOrderInvoiceLineItemCategoryEnum } from '../schemas/job-orders.schema';

export class ReissuedInvoiceLineItemDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sourceJobOrderItemId?: string;

  @ApiProperty({ enum: jobOrderInvoiceLineItemCategoryEnum.enumValues, example: 'labor' })
  @IsEnum(jobOrderInvoiceLineItemCategoryEnum.enumValues)
  category!: (typeof jobOrderInvoiceLineItemCategoryEnum.enumValues)[number];

  @ApiProperty({ example: 'Brake system diagnosis and repair', maxLength: 240 })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  description!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 999 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;

  @ApiProperty({ example: 125000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitAmountCents!: number;
}

export class VoidAndReissueJobOrderInvoiceDto {
  @ApiProperty({ example: 'Corrected an incorrectly billed brake-pad quantity.' })
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  correctionReason!: string;

  @ApiPropertyOptional({ example: 'Corrected service invoice after supervisor review.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservationFeeDeductionCents?: number;

  @ApiPropertyOptional({ type: () => ReissuedInvoiceLineItemDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReissuedInvoiceLineItemDto)
  lineItems?: ReissuedInvoiceLineItemDto[];
}
