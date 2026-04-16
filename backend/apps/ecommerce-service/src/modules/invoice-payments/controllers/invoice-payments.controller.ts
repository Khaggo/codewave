import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateInvoicePaymentEntryDto } from '../dto/create-invoice-payment-entry.dto';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { InvoicePaymentsService } from '../services/invoice-payments.service';

@ApiTags('invoice-payments')
@Controller()
export class InvoicePaymentsController {
  constructor(private readonly invoicePaymentsService: InvoicePaymentsService) {}

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get one invoice-tracking record by identifier.' })
  @ApiParam({
    name: 'id',
    description: 'Invoice identifier.',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  @ApiOkResponse({
    description: 'Invoice tracking detail.',
    type: InvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  getInvoiceById(@Param('id') id: string) {
    return this.invoicePaymentsService.findInvoiceById(id);
  }

  @Get('orders/:id/invoice')
  @ApiOperation({ summary: 'Get the invoice-tracking record linked to one order.' })
  @ApiParam({
    name: 'id',
    description: 'Order identifier.',
    example: '88888888-8888-4888-8888-888888888888',
  })
  @ApiOkResponse({
    description: 'Invoice linked to the given order.',
    type: InvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Invoice not found for the given order.' })
  getOrderInvoice(@Param('id') orderId: string) {
    return this.invoicePaymentsService.findInvoiceByOrderId(orderId);
  }

  @Post('invoices/:id/payments')
  @ApiOperation({ summary: 'Record one manual payment entry against an invoice-tracking record.' })
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
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  recordPaymentEntry(@Param('id') invoiceId: string, @Body() payload: CreateInvoicePaymentEntryDto) {
    return this.invoicePaymentsService.recordPaymentEntry(invoiceId, payload);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Apply one allowed manual tracking status to an invoice.' })
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
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  updateInvoiceStatus(@Param('id') invoiceId: string, @Body() payload: UpdateInvoiceStatusDto) {
    return this.invoicePaymentsService.updateInvoiceStatus(invoiceId, payload);
  }
}
