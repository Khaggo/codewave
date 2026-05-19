import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '@ecommerce-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@ecommerce-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@ecommerce-modules/auth/guards/roles.guard';

import { CreateInvoicePaymentEntryDto } from '../dto/create-invoice-payment-entry.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { InvoicePaymentsService } from '../services/invoice-payments.service';

@ApiTags('invoice-payments')
@Controller()
export class InvoicePaymentsController {
  constructor(private readonly invoicePaymentsService: InvoicePaymentsService) {}

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get one invoice-tracking record by identifier.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Invoice identifier.',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  @ApiOkResponse({
    description: 'Invoice tracking detail.',
    type: InvoiceResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can load invoice detail by id.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getInvoiceById(@Param('id') id: string, @Req() request: Request) {
    return this.invoicePaymentsService.findInvoiceById(id, request.user as { userId: string; role: string });
  }

  @Get('orders/:id/invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Get the invoice-tracking record linked to one order.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Invoice linked to the given order.',
    type: InvoiceResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Customers can only access invoice tracking for their own ecommerce order.' })
  @ApiNotFoundResponse({ description: 'Invoice not found for the given order.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getOrderInvoice(@Param('id') orderId: string, @Req() request: Request) {
    return this.invoicePaymentsService.findInvoiceByOrderId(
      orderId,
      request.user as { userId: string; role: string },
    );
  }

  @Post('orders/:id/invoice/paymongo/checkout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Create or refresh a PayMongo checkout session for an ecommerce invoice.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Updated invoice with online checkout metadata.',
    type: InvoiceResponseDto,
  })
  @ApiConflictResponse({ description: 'The ecommerce invoice cannot start online payment.' })
  @ApiForbiddenResponse({ description: 'Customers can only start checkout for their own ecommerce invoice.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  createPaymongoCheckout(
    @Param('id') orderId: string,
    @Req() request: Request,
    @Headers('x-mobile-success-url') mobileSuccessUrl?: string,
    @Headers('x-mobile-cancel-url') mobileCancelUrl?: string,
  ) {
    return this.invoicePaymentsService.createPaymongoCheckoutForOrder(
      orderId,
      request.user as { userId: string; role: string },
      {
        successUrl: mobileSuccessUrl,
        cancelUrl: mobileCancelUrl,
      },
    );
  }

  @Post('orders/:id/invoice/paymongo/reconcile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Refresh the latest PayMongo payment state for an ecommerce invoice.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Updated invoice with refreshed online payment state.',
    type: InvoiceResponseDto,
  })
  @ApiConflictResponse({ description: 'No PayMongo checkout session exists or the invoice cannot be refreshed.' })
  @ApiForbiddenResponse({ description: 'Customers can only refresh checkout for their own ecommerce invoice.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  reconcilePaymongoCheckout(@Param('id') orderId: string, @Req() request: Request) {
    return this.invoicePaymentsService.reconcilePaymongoCheckoutForOrder(
      orderId,
      request.user as { userId: string; role: string },
    );
  }

  @Post('invoices/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Record one manual payment entry against an invoice-tracking record.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Invoice identifier.',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  @ApiCreatedResponse({
    description: 'Payment entry recorded and invoice balances recalculated.',
    type: InvoiceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payment entry payload failed validation.' })
  @ApiConflictResponse({
    description: 'Payment entry exceeds balance or the invoice can no longer accept manual entries.',
  })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can record invoice payment entries.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  recordPaymentEntry(@Param('id') invoiceId: string, @Body() payload: CreateInvoicePaymentEntryDto) {
    return this.invoicePaymentsService.recordPaymentEntry(invoiceId, payload);
  }

  @Patch('invoices/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'Apply one allowed manual tracking status to an invoice.' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'Invoice identifier.',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  @ApiOkResponse({
    description: 'Invoice status updated successfully.',
    type: InvoiceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invoice status payload failed validation.' })
  @ApiConflictResponse({ description: 'The requested manual invoice status is not allowed.' })
  @ApiForbiddenResponse({ description: 'Only service advisers or super admins can update invoice tracking status.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  updateInvoiceStatus(@Param('id') invoiceId: string, @Body() payload: UpdateInvoiceStatusDto) {
    return this.invoicePaymentsService.updateInvoiceStatus(invoiceId, payload);
  }

  @Post('ecommerce/payments/paymongo/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive PayMongo webhooks for ecommerce invoice checkout sessions.' })
  @ApiOkResponse({
    description: 'Webhook accepted.',
    schema: {
      example: {
        received: true,
        ignored: false,
        eventType: 'checkout_session.payment.paid',
        invoiceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        orderId: '88888888-8888-4888-8888-888888888888',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid webhook payload or signature.' })
  handlePaymongoWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('paymongo-signature') signatureHeader?: string,
  ) {
    const rawPayload = request.rawBody ?? request.body;
    return this.invoicePaymentsService.handlePaymongoWebhook(rawPayload, signatureHeader);
  }
}
