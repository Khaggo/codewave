import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderStatusHistoryResponseDto {
  @ApiProperty({
    example: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  })
  id!: string;

  @ApiPropertyOptional({
    example: 'invoice_pending',
    enum: ['invoice_pending', 'awaiting_fulfillment', 'fulfilled', 'cancelled'],
  })
  previousStatus!: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled' | null;

  @ApiProperty({
    example: 'awaiting_fulfillment',
    enum: ['invoice_pending', 'awaiting_fulfillment', 'fulfilled', 'cancelled'],
  })
  nextStatus!: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';

  @ApiPropertyOptional({
    example: 'Invoice verified by staff and released to fulfillment.',
  })
  reason!: string | null;

  @ApiProperty({
    example: 'status_update',
    enum: ['checkout', 'status_update', 'cancel'],
  })
  transitionType!: 'checkout' | 'status_update' | 'cancel';

  @ApiProperty({
    example: '2026-05-14T05:15:00.000Z',
    format: 'date-time',
  })
  changedAt!: string;
}
