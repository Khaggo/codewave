import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const insuranceBroadcastResultStatusValues = ['sent', 'skipped', 'failed'] as const;

export class SendInsuranceBroadcastResultDto {
  @ApiProperty({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  inquiryId!: string;

  @ApiPropertyOptional({
    example: '55555555-5555-4555-8555-555555555555',
    nullable: true,
  })
  customerId!: string | null;

  @ApiProperty({
    enum: insuranceBroadcastResultStatusValues,
    example: 'sent',
  })
  status!: (typeof insuranceBroadcastResultStatusValues)[number];

  @ApiPropertyOptional({
    example: 'Customer already received an equivalent broadcast in this send.',
    nullable: true,
  })
  reason!: string | null;
}

export class SendInsuranceBroadcastsResponseDto {
  @ApiProperty({
    example: 3,
  })
  targetedCaseCount!: number;

  @ApiProperty({
    example: 2,
  })
  eligibleCaseCount!: number;

  @ApiProperty({
    example: 2,
  })
  deduplicatedCustomerCount!: number;

  @ApiProperty({
    example: 2,
  })
  sentCount!: number;

  @ApiProperty({
    example: 1,
  })
  skippedCount!: number;

  @ApiProperty({
    example: 0,
  })
  failedCount!: number;

  @ApiProperty({
    type: () => SendInsuranceBroadcastResultDto,
    isArray: true,
  })
  results!: SendInsuranceBroadcastResultDto[];
}
