import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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

import { CancelOrderDto } from '../dto/cancel-order.dto';
import { CheckoutInvoiceDto } from '../dto/checkout-invoice.dto';
import { OrderHistoryQueryDto } from '../dto/order-history-query.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout/invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Create an invoice-backed ecommerce order from the active cart.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Order created successfully and linked to an invoice.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Checkout payload failed validation.' })
  @ApiConflictResponse({
    description: 'Cart is empty or contains unavailable products and cannot be checked out.',
  })
  @ApiForbiddenResponse({ description: 'Customers can only check out their own ecommerce cart.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  checkoutInvoice(@Body() payload: CheckoutInvoiceDto, @Req() request: Request) {
    return this.ordersService.checkoutInvoice(payload, request.user as { userId: string; role: string });
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get a single ecommerce order with snapshot details.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Order detail with item, address, and invoice summary snapshots.',
    type: OrderResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own ecommerce orders.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getOrderById(@Param('id') id: string, @Req() request: Request) {
    return this.ordersService.getOrderById(id, request.user as { userId: string; role: string });
  }

  @Get('users/:id/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List ecommerce orders for one customer identity.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Customer identifier.',
    example: '55555555-5555-4555-8555-555555555555',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['invoice_pending', 'awaiting_fulfillment', 'fulfilled', 'cancelled'],
  })
  @ApiQuery({
    name: 'invoiceStatus',
    required: false,
    enum: ['pending_payment', 'partially_paid', 'paid', 'overdue', 'cancelled'],
  })
  @ApiOkResponse({
    description: 'Ecommerce order history for the given customer.',
    type: OrderResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access their own ecommerce order history.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  listOrdersByUserId(@Param('id') customerUserId: string, @Query() query: OrderHistoryQueryDto, @Req() request: Request) {
    return this.ordersService.listOrdersByUserId(
      customerUserId,
      request.user as { userId: string; role: string },
      query,
    );
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Advance one ecommerce order through its tracked lifecycle.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Order status updated successfully.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Order status update payload failed validation.' })
  @ApiConflictResponse({ description: 'The requested order transition is not allowed.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can update ecommerce order status.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateOrderStatus(@Param('id') id: string, @Body() payload: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, payload);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Cancel one ecommerce order while preserving its historical snapshots.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Order cancelled successfully.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Order cancellation payload failed validation.' })
  @ApiConflictResponse({ description: 'The order can no longer be cancelled.' })
  @ApiForbiddenResponse({ description: 'Customers can only cancel their own ecommerce orders.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  cancelOrder(@Param('id') id: string, @Body() payload: CancelOrderDto, @Req() request: Request) {
    return this.ordersService.cancelOrder(id, payload, request.user as { userId: string; role: string });
  }
}
