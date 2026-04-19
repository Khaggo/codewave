import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { loyaltySourceTypeEnum, loyaltyTransactionTypeEnum } from '../schemas/loyalty.schema';

export class LoyaltyTransactionResponseDto {
  @ApiProperty({
    example: '2b6464bb-c8a2-43ad-b051-13d0dbf6e45f',
  })
  id!: string;

  @ApiProperty({
    example: '4d18cf50-617d-42de-9df4-d7cd2945ce7c',
  })
  loyaltyAccountId!: string;

  @ApiProperty({
    enum: loyaltyTransactionTypeEnum.enumValues,
    example: 'accrual',
  })
  transactionType!: (typeof loyaltyTransactionTypeEnum.enumValues)[number];

  @ApiProperty({
    enum: loyaltySourceTypeEnum.enumValues,
    example: 'service_payment',
  })
  sourceType!: (typeof loyaltySourceTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'service-payment-record-1',
  })
  sourceReference!: string;

  @ApiPropertyOptional({
    example: 'loyalty:service.payment_recorded:service-payment-record-1',
  })
  idempotencyKey?: string | null;

  @ApiPropertyOptional({
    example: 'loyalty.service.payment_recorded.v1',
  })
  policyKey?: string | null;

  @ApiProperty({
    example: 100,
  })
  pointsDelta!: number;

  @ApiProperty({
    example: 131,
  })
  resultingBalance!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {
      triggerName: 'service.payment_recorded',
      appliedRuleIds: ['rule-1'],
      sourceDomain: 'main-service.job-orders',
      duplicateStrategy: 'ignore_same_idempotency_key',
    },
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
