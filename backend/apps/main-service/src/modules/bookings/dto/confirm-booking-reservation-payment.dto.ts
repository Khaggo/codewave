import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmBookingReservationPaymentDto {
  @ApiProperty({
    example: 'paymongo',
    enum: ['paymongo', 'manual_counter'],
  })
  @IsIn(['paymongo', 'manual_counter'])
  provider!: 'paymongo' | 'manual_counter';

  @ApiPropertyOptional({
    example: 'PAYMONGO-TEST-123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerPaymentId?: string;

  @ApiPropertyOptional({
    example: 'COUNTER-2026-0001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNumber?: string;
}
