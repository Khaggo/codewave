import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import {
  JOB_ORDER_INVOICE_PAYMENT_METHODS,
  normalizeJobOrderInvoicePaymentMethod,
} from './payment-methods';
import type { JobOrderInvoicePaymentMethod } from './payment-methods';

export class FinalizeJobOrderDto {
  @ApiPropertyOptional({
    example: 'All planned work items completed and ready for invoice generation.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional({
    example: 2500,
    description: 'Displayed currency amount in whole peso units, converted internally to cents.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountPaid?: number;

  @ApiPropertyOptional({
    example: 'cash',
    enum: JOB_ORDER_INVOICE_PAYMENT_METHODS,
    description: 'Canonical values are cash, bank_transfer, check, and other; legacy separators and cheque are accepted.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeJobOrderInvoicePaymentMethod(value))
  @IsIn([...JOB_ORDER_INVOICE_PAYMENT_METHODS])
  paymentMethod?: JobOrderInvoicePaymentMethod;

  @ApiPropertyOptional({
    example: 'GCASH-TEST-1234',
    description: 'Optional external payment processor or counter reference.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @ApiPropertyOptional({
    example: '2026-05-05T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
