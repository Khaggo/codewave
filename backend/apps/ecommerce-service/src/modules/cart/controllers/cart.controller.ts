import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@ecommerce-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@ecommerce-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@ecommerce-modules/auth/guards/roles.guard';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get the active cart for the current ecommerce customer context.' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'customerUserId',
    description: 'Customer identifier for the active cart context.',
    example: '55555555-5555-4555-8555-555555555555',
  })
  @ApiOkResponse({
    description: 'Current active cart state.',
    type: CartResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own active cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getCart(@Query() query: CartCustomerQueryDto, @Req() request: Request) {
    return this.cartService.getCart(query.customerUserId, request.user as { userId: string; role: string });
  }

  @Post('cart/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Add a product to the active cart or increase its quantity.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Updated cart after the item was added.',
    type: CartResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Cart item payload failed validation.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiConflictResponse({ description: 'Product is inactive and cannot be added to the cart.' })
  @ApiForbiddenResponse({ description: 'Customers can only modify their own active cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @HttpCode(200)
  addItem(@Body() payload: AddCartItemDto, @Req() request: Request) {
    return this.cartService.addItem(payload, request.user as { userId: string; role: string });
  }

  @Patch('cart/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Update the quantity of an existing cart item.' })
  @ApiBearerAuth('access-token')
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
  @ApiForbiddenResponse({ description: 'Customers can only modify their own active cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateItem(@Param('itemId') itemId: string, @Body() payload: UpdateCartItemDto, @Req() request: Request) {
    return this.cartService.updateItem(itemId, payload, request.user as { userId: string; role: string });
  }

  @Delete('cart/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Remove an item from the active cart.' })
  @ApiBearerAuth('access-token')
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
  @ApiForbiddenResponse({ description: 'Customers can only modify their own active cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  removeItem(@Param('itemId') itemId: string, @Query() query: CartCustomerQueryDto, @Req() request: Request) {
    return this.cartService.removeItem(
      itemId,
      query.customerUserId,
      request.user as { userId: string; role: string },
    );
  }

  @Post('cart/checkout-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Validate the active cart before invoice checkout.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Checkout preview for invoice-based checkout.',
    type: CheckoutPreviewResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Checkout preview payload failed validation.' })
  @ApiConflictResponse({
    description: 'Cart is empty or contains unavailable products and cannot be checked out.',
  })
  @ApiForbiddenResponse({ description: 'Customers can only validate checkout for their own active cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @HttpCode(200)
  checkoutPreview(@Body() payload: CheckoutPreviewDto, @Req() request: Request) {
    return this.cartService.getCheckoutPreview(
      payload.customerUserId,
      request.user as { userId: string; role: string },
    );
  }
}
