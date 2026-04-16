import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuPattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'catalog-category-engine-parts',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'Synthetic Engine Oil 5W-30',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    example: 'synthetic-engine-oil-5w30',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(slugPattern, {
    message: 'slug must use lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'ENG-OIL-SYN-5W30',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(skuPattern, {
    message: 'sku must use uppercase letters, numbers, and hyphens only',
  })
  sku?: string;

  @ApiPropertyOptional({
    example: 'Updated product description for the first live catalog iteration.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 194900,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
