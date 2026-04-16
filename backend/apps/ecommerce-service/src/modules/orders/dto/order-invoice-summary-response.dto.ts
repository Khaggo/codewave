import { ApiProperty } from '@nestjs/swagger';

export class OrderInvoiceSummaryResponseDto {
  @ApiProperty({
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  id!: string;

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
    example: 189900,
  })
  totalCents!: number;

  @ApiProperty({
    example: 189900,
  })
  amountDueCents!: number;
}
