import { ApiProperty } from '@nestjs/swagger';

export class InventoryProductResponseDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  id!: string;

  @ApiProperty({ example: 'Premium Engine Oil 5W-30' })
  name!: string;

  @ApiProperty({ example: 'ENG-OIL-5W30' })
  sku!: string;

  @ApiProperty({ example: 'Engine Parts' })
  categoryLabel!: string;

  @ApiProperty({ example: 189900 })
  priceCents!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 12 })
  quantityOnHand!: number;

  @ApiProperty({ example: 4 })
  reorderThreshold!: number;

  @ApiProperty({ example: 'in_stock', enum: ['in_stock', 'low_stock', 'out_of_stock'] })
  stockState!: 'in_stock' | 'low_stock' | 'out_of_stock';

  @ApiProperty({ example: '2026-05-20T06:31:00.000Z', format: 'date-time' })
  updatedAt!: string;
}
