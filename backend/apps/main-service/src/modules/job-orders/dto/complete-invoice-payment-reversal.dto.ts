import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteInvoicePaymentReversalDto {
  @ApiProperty({ example: 'Refund completed before invoice correction.' })
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ example: 'REFUND-2026-000123' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  reversalReference!: string;

  @ApiProperty({ example: '2026-08-08T10:30:00.000Z', format: 'date-time' })
  @IsDateString()
  completedAt!: string;
}
