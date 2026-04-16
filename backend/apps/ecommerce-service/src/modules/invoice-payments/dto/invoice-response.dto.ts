import { ApiProperty } from '@nestjs/swagger';

import { InvoicePaymentEntryResponseDto } from './invoice-payment-entry-response.dto';

export class InvoiceResponseDto {
  @ApiProperty({
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  id!: string;

  @ApiProperty({
    example: '88888888-8888-4888-8888-888888888888',
  })
  orderId!: string;

  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  customerUserId!: string;

  @ApiProperty({
    example: 'INV-2026-0001',
  })
  invoiceNumber!: string;

  @ApiProperty({
    example: 'pending_payment',
    enum: ['pending_payment', 'partially_paid', 'paid', 'overdue', 'cancelled'],
  })
  status!: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

  @ApiProperty({
    example: 'PHP',
  })
  currencyCode!: string;

  @ApiProperty({
    example: 189900,
  })
  totalCents!: number;

  @ApiProperty({
    example: 0,
  })
  amountPaidCents!: number;

  @ApiProperty({
    example: 189900,
  })
  amountDueCents!: number;

  @ApiProperty({
    example: 'current',
    enum: ['current', 'overdue_1_7', 'overdue_8_30', 'overdue_31_plus', 'settled', 'cancelled'],
  })
  agingBucket!: 'current' | 'overdue_1_7' | 'overdue_8_30' | 'overdue_31_plus' | 'settled' | 'cancelled';

  @ApiProperty({
    example: 0,
  })
  daysPastDue!: number;

  @ApiProperty({
    type: () => InvoicePaymentEntryResponseDto,
    isArray: true,
  })
  paymentEntries!: InvoicePaymentEntryResponseDto[];

  @ApiProperty({
    example: '2026-05-14T05:00:00.000Z',
    format: 'date-time',
  })
  issuedAt!: string;

  @ApiProperty({
    example: '2026-05-21T05:00:00.000Z',
    format: 'date-time',
  })
  dueAt!: string;

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
