import { ApiProperty } from '@nestjs/swagger';

import { CartItemResponseDto } from './cart-item-response.dto';

export class CheckoutPreviewResponseDto {
  @ApiProperty({
    example: '77777777-7777-4777-8777-777777777777',
  })
  cartId!: string;

  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  customerUserId!: string;

  @ApiProperty({
    example: 'invoice',
    enum: ['invoice'],
  })
  checkoutMode!: 'invoice';

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
}
