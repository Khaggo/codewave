import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Create an invoice-backed ecommerce order from the active cart.' })
  @ApiCreatedResponse({
    description: 'Order created successfully and linked to an invoice.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Checkout payload failed validation.' })
  @ApiConflictResponse({
    description: 'Cart is empty or contains unavailable products and cannot be checked out.',
  })
  checkoutInvoice(@Body() payload: CheckoutInvoiceDto) {
    return this.ordersService.checkoutInvoice(payload);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a single ecommerce order with snapshot details.' })
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Order detail with item, address, and invoice summary snapshots.',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get('users/:id/orders')
  @ApiOperation({ summary: 'List ecommerce orders for one customer identity.' })
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
  listOrdersByUserId(@Param('id') customerUserId: string, @Query() query: OrderHistoryQueryDto) {
    return this.ordersService.listOrdersByUserId(customerUserId, query);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Advance one ecommerce order through its tracked lifecycle.' })
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
  @ApiNotFoundResponse({ description: 'Order not found.' })
  updateOrderStatus(@Param('id') id: string, @Body() payload: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, payload);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel one ecommerce order while preserving its historical snapshots.' })
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
  @ApiNotFoundResponse({ description: 'Order not found.' })
  cancelOrder(@Param('id') id: string, @Body() payload: CancelOrderDto) {
    return this.ordersService.cancelOrder(id, payload);
  }
}
