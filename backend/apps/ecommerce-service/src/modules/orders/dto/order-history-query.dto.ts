import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

const orderStatusValues = ['invoice_pending', 'awaiting_fulfillment', 'fulfilled', 'cancelled'] as const;
const invoiceStatusValues = ['pending_payment', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;

export class OrderHistoryQueryDto {
  @ApiPropertyOptional({
    enum: orderStatusValues,
    example: 'awaiting_fulfillment',
  })
  @IsOptional()
  @IsIn(orderStatusValues)
  status?: (typeof orderStatusValues)[number];

  @ApiPropertyOptional({
    enum: invoiceStatusValues,
    example: 'pending_payment',
  })
  @IsOptional()
  @IsIn(invoiceStatusValues)
  invoiceStatus?: (typeof invoiceStatusValues)[number];
}
