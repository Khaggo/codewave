import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const manualInvoiceStatusValues = ['pending_payment', 'overdue', 'cancelled'] as const;

export class UpdateInvoiceStatusDto {
  @ApiProperty({
    enum: manualInvoiceStatusValues,
    example: 'cancelled',
  })
  @IsIn(manualInvoiceStatusValues)
  status!: (typeof manualInvoiceStatusValues)[number];

  @ApiPropertyOptional({
    example: 'Invoice voided after the order was cancelled before payment.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
