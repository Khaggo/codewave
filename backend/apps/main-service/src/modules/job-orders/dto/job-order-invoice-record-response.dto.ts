import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class JobOrderInvoiceLineItemSnapshotResponseDto {
  @ApiProperty({ example: 'line-item-snapshot-1' })
  id!: string;

  @ApiProperty({ example: 2 })
  invoiceVersion!: number;

  @ApiProperty({ enum: ['service', 'labor', 'part', 'other'], example: 'labor' })
  category!: 'service' | 'labor' | 'part' | 'other';

  @ApiProperty({ example: 'Brake system diagnosis and repair' })
  description!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 125000 })
  unitAmountCents!: number;

  @ApiProperty({ example: 125000 })
  lineAmountCents!: number;
}

class JobOrderInvoiceCorrectionHistoryResponseDto {
  @ApiProperty({ example: 'invoice-correction-1' })
  id!: string;

  @ApiProperty({ enum: ['payment_reversal_completed', 'void_and_reissue'] })
  action!: 'payment_reversal_completed' | 'void_and_reissue';

  @ApiProperty({ example: 1 })
  fromVersion!: number;

  @ApiProperty({ example: 2 })
  toVersion!: number;

  @ApiProperty({ example: 'INV-SVC-20260808-103015123' })
  previousInvoiceReference!: string;

  @ApiPropertyOptional({ example: 'INV-SVC-20260808-111500123', nullable: true })
  newInvoiceReference!: string | null;

  @ApiProperty({ example: 'Corrected an incorrectly billed quantity.' })
  reason!: string;

  @ApiProperty({ example: '2026-08-08T11:15:00.000Z', format: 'date-time' })
  createdAt!: string;
}

export class JobOrderInvoiceRecordResponseDto {
  @ApiProperty({
    example: '44934b97-b1d0-4f85-8666-a2df86f2613b',
  })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  lineageId!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ enum: ['issued', 'voided'], example: 'issued' })
  lifecycleStatus!: 'issued' | 'voided';

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: 'INV-JO-20260413-0001',
  })
  invoiceReference!: string;

  @ApiPropertyOptional({ example: 'INV-SVC-20260808-103015123', nullable: true })
  previousInvoiceReference!: string | null;

  @ApiProperty({
    example: 'booking',
  })
  sourceType!: 'booking' | 'intake' | 'back_job';

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
    example: 'online_provider',
    enum: ['manual', 'online_provider'],
    nullable: true,
  })
  paymentChannel!: 'manual' | 'online_provider' | null;

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
    example: 'paymongo',
    nullable: true,
  })
  onlinePaymentProvider!: string | null;

  @ApiPropertyOptional({
    example: 'pending',
    enum: ['pending', 'paid', 'failed', 'expired', 'cancelled', 'unavailable'],
    nullable: true,
  })
  onlinePaymentStatus!: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'unavailable' | null;

  @ApiPropertyOptional({
    example: 'cs_test_checkout_123',
    nullable: true,
  })
  onlinePaymentSessionId!: string | null;

  @ApiPropertyOptional({
    example: 'https://checkout.paymongo.com/...',
    nullable: true,
  })
  onlinePaymentCheckoutUrl!: string | null;

  @ApiPropertyOptional({
    example: 'PM-REF-1234',
    nullable: true,
  })
  onlinePaymentReference!: string | null;

  @ApiPropertyOptional({
    example: '2026-05-14T10:30:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  onlinePaymentPaidAt!: string | null;

  @ApiPropertyOptional({
    example: null,
  })
  onlinePaymentFailureReason!: string | null;

  @ApiPropertyOptional({
    example: 'cashier-1',
    nullable: true,
  })
  recordedByUserId!: string | null;

  @ApiPropertyOptional({ enum: ['not_required', 'completed'] })
  paymentReversalStatus!: 'not_required' | 'completed';

  @ApiPropertyOptional({ example: 'REFUND-2026-000123', nullable: true })
  paymentReversalReference!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  paymentReversalCompletedAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastVoidedAt!: string | null;

  @ApiPropertyOptional({ example: 'Corrected an incorrectly billed quantity.', nullable: true })
  lastVoidReason!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  reissuedAt!: string | null;

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

  @ApiProperty({ type: () => JobOrderInvoiceLineItemSnapshotResponseDto, isArray: true })
  lineItemSnapshots!: JobOrderInvoiceLineItemSnapshotResponseDto[];

  @ApiProperty({ type: () => JobOrderInvoiceCorrectionHistoryResponseDto, isArray: true })
  correctionHistory!: JobOrderInvoiceCorrectionHistoryResponseDto[];

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
