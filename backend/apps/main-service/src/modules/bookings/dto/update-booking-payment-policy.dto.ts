import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBookingPaymentPolicyDto {
  @ApiPropertyOptional({
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservationFeeAmountCents?: number;

  @ApiPropertyOptional({
    example: 'PHP',
  })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  onlineExpiryWindowMinutes?: number;

  @ApiPropertyOptional({
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  counterExpiryWindowMinutes?: number;
}
