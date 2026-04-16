import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const paymentMethodValues = ['cash', 'bank_transfer', 'check', 'other'] as const;

export class CreateInvoicePaymentEntryDto {
  @ApiProperty({
    example: 30000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({
    enum: paymentMethodValues,
    example: 'cash',
  })
  @IsIn(paymentMethodValues)
  paymentMethod!: (typeof paymentMethodValues)[number];

  @ApiPropertyOptional({
    example: 'RCPT-2026-0001',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({
    example: 'Collected at the service counter.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-05-15T09:30:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
