import { ApiProperty } from '@nestjs/swagger';

class LoyaltyAnalyticsTotalsResponseDto {
  @ApiProperty({ example: 12 })
  accountCount!: number;

  @ApiProperty({ example: 950 })
  totalPointsBalance!: number;

  @ApiProperty({ example: 1600 })
  totalPointsEarned!: number;

  @ApiProperty({ example: 650 })
  totalPointsRedeemed!: number;

  @ApiProperty({ example: 4 })
  redemptionCount!: number;
}

class LoyaltyAnalyticsTransactionTypeResponseDto {
  @ApiProperty({ example: 'accrual' })
  transactionType!: string;

  @ApiProperty({ example: 10 })
  count!: number;

  @ApiProperty({ example: 1200 })
  netPointsDelta!: number;
}

class LoyaltyAnalyticsRewardUsageResponseDto {
  @ApiProperty({ example: '3cf589db-fc31-4a81-a4d8-ec47cefaaf53' })
  rewardId!: string;

  @ApiProperty({ example: 'Free Car Wash' })
  rewardName!: string;

  @ApiProperty({ example: 'active' })
  rewardStatus!: string;

  @ApiProperty({ example: 3 })
  redemptionCount!: number;

  @ApiProperty({ example: ['redemption-1', 'redemption-2'], type: [String] })
  sourceRedemptionIds!: string[];
}

export class LoyaltyAnalyticsResponseDto {
  @ApiProperty({ example: '2026-04-16T15:41:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '1d0296aa-7b28-48e7-a3df-8d0b2260b1d5' })
  refreshJobId!: string;

  @ApiProperty({ type: () => LoyaltyAnalyticsTotalsResponseDto })
  totals!: LoyaltyAnalyticsTotalsResponseDto;

  @ApiProperty({ type: () => LoyaltyAnalyticsTransactionTypeResponseDto, isArray: true })
  transactionTypes!: LoyaltyAnalyticsTransactionTypeResponseDto[];

  @ApiProperty({ type: () => LoyaltyAnalyticsRewardUsageResponseDto, isArray: true })
  topRewards!: LoyaltyAnalyticsRewardUsageResponseDto[];
}
