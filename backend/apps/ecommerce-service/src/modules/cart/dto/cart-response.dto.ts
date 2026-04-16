import { ApiProperty } from '@nestjs/swagger';

import { CartItemResponseDto } from './cart-item-response.dto';

export class CartResponseDto {
  @ApiProperty({
    example: '77777777-7777-4777-8777-777777777777',
  })
  id!: string;

  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  customerUserId!: string;

  @ApiProperty({
    type: () => CartItemResponseDto,
    isArray: true,
  })
  items!: CartItemResponseDto[];

  @ApiProperty({
    example: 379800,
  })
  subtotalCents!: number;

  @ApiProperty({
    example: 2,
  })
  totalQuantity!: number;

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
