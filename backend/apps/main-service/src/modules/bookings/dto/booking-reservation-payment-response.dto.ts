import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingReservationPaymentResponseDto {
  @ApiProperty({
    example: 'paymongo',
    enum: ['paymongo', 'manual_counter'],
  })
  provider!: 'paymongo' | 'manual_counter';

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'],
  })
  status!: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

  @ApiProperty({
    example: 50000,
  })
  amountCents!: number;

  @ApiProperty({
    example: 'PHP',
  })
  currencyCode!: string;

  @ApiPropertyOptional({
    example: 'https://checkout.paymongo.com/session/demo',
  })
  providerCheckoutUrl?: string | null;

  @ApiPropertyOptional({
    example: 'RES-2026-0001',
  })
  referenceNumber?: string | null;

  @ApiPropertyOptional({
    example: 'Payment is still waiting for customer completion.',
  })
  failureReason?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T08:30:00.000Z',
    format: 'date-time',
  })
  expiresAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T08:10:00.000Z',
    format: 'date-time',
  })
  paidAt?: string | null;
}
