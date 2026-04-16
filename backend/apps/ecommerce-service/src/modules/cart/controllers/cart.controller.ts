import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { CartCustomerQueryDto } from '../dto/cart-customer-query.dto';
import { CartResponseDto } from '../dto/cart-response.dto';
import { CheckoutPreviewDto } from '../dto/checkout-preview.dto';
import { CheckoutPreviewResponseDto } from '../dto/checkout-preview-response.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartService } from '../services/cart.service';

@ApiTags('cart')
@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('cart')
  @ApiOperation({ summary: 'Get the active cart for the current ecommerce customer context.' })
  @ApiQuery({
    name: 'customerUserId',
    description: 'Customer identifier for the active cart context.',
    example: '55555555-5555-4555-8555-555555555555',
  })
  @ApiOkResponse({
    description: 'Current active cart state.',
    type: CartResponseDto,
  })
  getCart(@Query() query: CartCustomerQueryDto) {
    return this.cartService.getCart(query.customerUserId);
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add a product to the active cart or increase its quantity.' })
  @ApiOkResponse({
    description: 'Updated cart after the item was added.',
    type: CartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Cart item payload failed validation.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiConflictResponse({ description: 'Product is inactive and cannot be added to the cart.' })
  @HttpCode(200)
  addItem(@Body() payload: AddCartItemDto) {
    return this.cartService.addItem(payload);
  }

  @Patch('cart/items/:itemId')
  @ApiOperation({ summary: 'Update the quantity of an existing cart item.' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item identifier.',
    example: '66666666-6666-4666-8666-666666666666',
  })
  @ApiOkResponse({
    description: 'Updated cart after the item quantity changed.',
    type: CartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Cart item update payload failed validation.' })
  @ApiNotFoundResponse({ description: 'Cart item not found.' })
  @ApiConflictResponse({ description: 'Product is inactive and cannot stay in the cart.' })
  updateItem(@Param('itemId') itemId: string, @Body() payload: UpdateCartItemDto) {
    return this.cartService.updateItem(itemId, payload);
  }

  @Delete('cart/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the active cart.' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item identifier.',
    example: '66666666-6666-4666-8666-666666666666',
  })
  @ApiQuery({
    name: 'customerUserId',
    description: 'Customer identifier for the active cart context.',
    example: '55555555-5555-4555-8555-555555555555',
  })
  @ApiOkResponse({
    description: 'Updated cart after the item was removed.',
    type: CartResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Cart item not found.' })
  removeItem(@Param('itemId') itemId: string, @Query() query: CartCustomerQueryDto) {
    return this.cartService.removeItem(itemId, query.customerUserId);
  }

  @Post('cart/checkout-preview')
  @ApiOperation({ summary: 'Validate the active cart before invoice checkout.' })
  @ApiOkResponse({
    description: 'Checkout preview for invoice-based checkout.',
    type: CheckoutPreviewResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Checkout preview payload failed validation.' })
  @ApiConflictResponse({
    description: 'Cart is empty or contains unavailable products and cannot be checked out.',
  })
  @HttpCode(200)
  checkoutPreview(@Body() payload: CheckoutPreviewDto) {
    return this.cartService.getCheckoutPreview(payload.customerUserId);
  }
}
