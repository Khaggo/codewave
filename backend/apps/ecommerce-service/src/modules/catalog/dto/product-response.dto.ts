import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductCategoryResponseDto } from './product-category-response.dto';

export class ProductResponseDto {
  @ApiProperty({
    example: 'a79320b0-02f1-43e4-ac29-9553d8205b2d',
  })
  id!: string;

  @ApiProperty({
    example: 'Premium Engine Oil 5W-30',
  })
  name!: string;

  @ApiProperty({
    example: 'premium-engine-oil-5w30',
  })
  slug!: string;

  @ApiProperty({
    example: 'ENG-OIL-5W30',
  })
  sku!: string;

  @ApiPropertyOptional({
    example: 'Bootstrap-ready catalog placeholder for follow-up catalog work.',
  })
  description?: string | null;

  @ApiProperty({
    example: 189900,
    description: 'Price in the smallest currency unit.',
  })
  priceCents!: number;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    type: () => ProductCategoryResponseDto,
  })
  category!: ProductCategoryResponseDto;

  @ApiProperty({
    example: '2026-05-12T03:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-12T03:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
