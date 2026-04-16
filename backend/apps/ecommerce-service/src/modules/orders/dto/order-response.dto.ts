import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrderAddressResponseDto } from './order-address-response.dto';
import { OrderInvoiceSummaryResponseDto } from './order-invoice-summary-response.dto';
import { OrderItemResponseDto } from './order-item-response.dto';
import { OrderStatusHistoryResponseDto } from './order-status-history-response.dto';

export class OrderResponseDto {
  @ApiProperty({
    example: '88888888-8888-4888-8888-888888888888',
  })
  id!: string;

  @ApiProperty({
    example: 'ORD-2026-0001',
  })
  orderNumber!: string;

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
    example: 'invoice_pending',
    enum: ['invoice_pending', 'awaiting_fulfillment', 'fulfilled', 'cancelled'],
  })
  status!: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';

  @ApiProperty({
    example: 189900,
  })
  subtotalCents!: number;

  @ApiPropertyOptional({
    example: 'Please prepare the invoice for branch pickup.',
  })
  notes?: string | null;

  @ApiProperty({
    type: () => OrderItemResponseDto,
    isArray: true,
  })
  items!: OrderItemResponseDto[];

  @ApiProperty({
    type: () => OrderAddressResponseDto,
    isArray: true,
  })
  addresses!: OrderAddressResponseDto[];

  @ApiProperty({
    type: () => OrderInvoiceSummaryResponseDto,
  })
  invoice!: OrderInvoiceSummaryResponseDto | null;

  @ApiProperty({
    type: () => OrderStatusHistoryResponseDto,
    isArray: true,
  })
  statusHistory!: OrderStatusHistoryResponseDto[];

  @ApiProperty({
    example: '2026-05-14T05:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-14T05:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
