import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoicePaymentEntryResponseDto {
  @ApiProperty({
    example: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  })
  id!: string;

  @ApiProperty({
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  invoiceId!: string;

  @ApiProperty({
    example: 30000,
  })
  amountCents!: number;

  @ApiProperty({
    enum: ['cash', 'bank_transfer', 'check', 'other'],
    example: 'cash',
  })
  paymentMethod!: 'cash' | 'bank_transfer' | 'check' | 'other';

  @ApiPropertyOptional({
    example: 'RCPT-2026-0001',
  })
  reference!: string | null;

  @ApiPropertyOptional({
    example: 'Collected at the service counter.',
  })
  notes!: string | null;

  @ApiProperty({
    example: '2026-05-15T09:30:00.000Z',
    format: 'date-time',
  })
  receivedAt!: string;

  @ApiProperty({
    example: '2026-05-15T09:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
