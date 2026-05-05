import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
    enum: ['cash', 'bank_transfer', 'check', 'other'],
  })
  @IsOptional()
  @IsIn(['cash', 'bank_transfer', 'check', 'other'])
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'other';

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
}
