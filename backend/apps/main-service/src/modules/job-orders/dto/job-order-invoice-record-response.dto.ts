import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobOrderInvoiceRecordResponseDto {
  @ApiProperty({
    example: '44934b97-b1d0-4f85-8666-a2df86f2613b',
  })
  id!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: 'INV-JO-20260413-0001',
  })
  invoiceReference!: string;

  @ApiProperty({
    example: 'booking',
  })
  sourceType!: 'booking' | 'back_job';

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  sourceId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  customerUserId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: '5d9be480-c0be-4cc2-b89d-5c2ad7fc1c4d',
  })
  serviceAdviserUserId!: string;

  @ApiProperty({
    example: 'SA-1001',
  })
  serviceAdviserCode!: string;

  @ApiProperty({
    example: '5d9be480-c0be-4cc2-b89d-5c2ad7fc1c4d',
  })
  finalizedByUserId!: string;

  @ApiProperty({
    example: 'pending_payment',
    enum: ['pending_payment', 'paid'],
  })
  paymentStatus!: 'pending_payment' | 'paid';

  @ApiProperty({
    example: 'PHP',
  })
  currencyCode!: string;

  @ApiProperty({
    example: 250000,
  })
  subtotalAmountCents!: number;

  @ApiProperty({
    example: 180000,
  })
  laborAmountCents!: number;

  @ApiProperty({
    example: 70000,
  })
  partsAmountCents!: number;

  @ApiProperty({
    example: 50000,
  })
  reservationFeeDeductionCents!: number;

  @ApiProperty({
    example: 200000,
  })
  totalAmountCents!: number;

  @ApiPropertyOptional({
    example: 159900,
    nullable: true,
  })
  amountPaidCents!: number | null;

  @ApiPropertyOptional({
    example: 'cash',
    enum: ['cash', 'bank_transfer', 'check', 'other'],
    nullable: true,
  })
  paymentMethod!: 'cash' | 'bank_transfer' | 'check' | 'other' | null;

  @ApiPropertyOptional({
    example: 'OR-2026-0001',
    nullable: false,
  })
  officialReceiptReference!: string;

  @ApiPropertyOptional({
    example: 'GCASH-TEST-1234',
    nullable: true,
  })
  paymentReference!: string | null;

  @ApiPropertyOptional({
    example: 'cashier-1',
    nullable: true,
  })
  recordedByUserId!: string | null;

  @ApiPropertyOptional({
    example: '2026-05-14T10:30:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  paidAt!: string | null;

  @ApiPropertyOptional({
    example: 'All planned work items completed and ready for invoice generation.',
  })
  summary?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T10:30:00.000Z',
    format: 'date-time',
  })
  pdfGeneratedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T10:31:00.000Z',
    format: 'date-time',
  })
  pdfEmailSentAt?: string | null;

  @ApiPropertyOptional({
    example: null,
  })
  pdfEmailError?: string | null;

  @ApiProperty({
    example: '2026-04-13T12:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-13T12:30:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
