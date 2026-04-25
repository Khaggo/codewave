import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuPattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export class CreateProductDto {
  @ApiProperty({
    example: 'catalog-category-engine-parts',
  })
  @IsUUID('4', { message: 'categoryId must be a UUID' })
  categoryId!: string;

  @ApiProperty({
    example: 'Premium Engine Oil 5W-30',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    example: 'premium-engine-oil-5w30',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  @Matches(slugPattern, {
    message: 'slug must use lowercase letters, numbers, and hyphens only',
  })
  slug!: string;

  @ApiProperty({
    example: 'ENG-OIL-5W30',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  @Matches(skuPattern, {
    message: 'sku must use uppercase letters, numbers, and hyphens only',
  })
  sku!: string;

  @ApiPropertyOptional({
    example: 'Fully synthetic 5W-30 engine oil for smoother starts and regular PMS top-ups.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: 189900,
    minimum: 0,
    description: 'Price in the smallest currency unit.',
  })
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
