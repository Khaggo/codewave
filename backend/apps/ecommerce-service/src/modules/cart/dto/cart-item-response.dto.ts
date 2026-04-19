import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    example: '66666666-6666-4666-8666-666666666666',
  })
  id!: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
  })
  productId!: string;

  @ApiPropertyOptional({
    example: '11111111-1111-4111-8111-111111111111',
  })
  productCategoryId!: string | null;

  @ApiPropertyOptional({
    example: 'Premium Engine Oil 5W-30',
  })
  productName!: string | null;

  @ApiPropertyOptional({
    example: 'premium-engine-oil-5w30',
  })
  productSlug!: string | null;

  @ApiPropertyOptional({
    example: 'ENG-OIL-5W30',
  })
  productSku!: string | null;

  @ApiProperty({
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    example: 189900,
  })
  unitPriceCents!: number;

  @ApiProperty({
    example: 379800,
  })
  lineTotalCents!: number;

  @ApiProperty({
    example: 'available',
    enum: ['available', 'inactive', 'missing'],
  })
  availabilityStatus!: 'available' | 'inactive' | 'missing';

  @ApiProperty({
    example: '2026-05-14T04:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-14T04:05:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
