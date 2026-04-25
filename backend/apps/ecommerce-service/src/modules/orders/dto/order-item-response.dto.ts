import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  id!: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
  })
  productId!: string;

  @ApiProperty({
    example: 'Premium Engine Oil 5W-30',
  })
  productName!: string;

  @ApiProperty({
    example: 'premium-engine-oil-5w30',
  })
  productSlug!: string;

  @ApiProperty({
    example: 'ENG-OIL-5W30',
  })
  sku!: string;

  @ApiPropertyOptional({
    example: 'Fully synthetic 5W-30 engine oil for smoother starts and regular PMS top-ups.',
  })
  description?: string | null;

  @ApiProperty({
    example: 1,
  })
  quantity!: number;

  @ApiProperty({
    example: 189900,
  })
  unitPriceCents!: number;

  @ApiProperty({
    example: 189900,
  })
  lineTotalCents!: number;
}
