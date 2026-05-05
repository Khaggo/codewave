import { ApiProperty } from '@nestjs/swagger';

export class BookingPaymentPolicyResponseDto {
  @ApiProperty({
    example: 50000,
  })
  reservationFeeAmountCents!: number;

  @ApiProperty({
    example: 'PHP',
  })
  currencyCode!: string;

  @ApiProperty({
    example: 30,
  })
  onlineExpiryWindowMinutes!: number;

  @ApiProperty({
    example: 0,
  })
  counterExpiryWindowMinutes!: number;
}
