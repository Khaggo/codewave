import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { jobOrderInvoicePaymentMethodEnum } from '../schemas/job-orders.schema';

export class RecordJobOrderInvoicePaymentDto {
  @ApiProperty({
    example: 159900,
    description: 'Settled invoice amount in cents.',
  })
  @IsInt()
  @Min(1)
  amountPaidCents!: number;

  @ApiProperty({
    enum: jobOrderInvoicePaymentMethodEnum.enumValues,
    example: 'cash',
  })
  @IsEnum(jobOrderInvoicePaymentMethodEnum.enumValues)
  paymentMethod!: (typeof jobOrderInvoicePaymentMethodEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'OR-2026-0001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({
    example: '2026-05-14T10:30:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
