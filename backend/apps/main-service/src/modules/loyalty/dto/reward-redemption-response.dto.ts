import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LoyaltyTransactionResponseDto } from './loyalty-transaction-response.dto';

export class RewardRedemptionResponseDto {
  @ApiProperty({
    example: '21fb9186-c63b-4d78-b9cb-1d4a197b4d39',
  })
  id!: string;

  @ApiProperty({
    example: '4d18cf50-617d-42de-9df4-d7cd2945ce7c',
  })
  loyaltyAccountId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  rewardId!: string;

  @ApiProperty({
    example: 'Free wheel alignment',
  })
  rewardNameSnapshot!: string;

  @ApiProperty({
    example: 100,
  })
  pointsCostSnapshot!: number;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  redeemedByUserId!: string;

  @ApiPropertyOptional({
    example: 'Redeemed during front-desk pickup.',
  })
  note?: string | null;

  @ApiProperty({
    example: 31,
  })
  pointsBalanceAfter!: number;

  @ApiProperty({
    type: () => LoyaltyTransactionResponseDto,
  })
  transaction!: LoyaltyTransactionResponseDto;

  @ApiProperty({
    example: '2026-05-14T10:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
