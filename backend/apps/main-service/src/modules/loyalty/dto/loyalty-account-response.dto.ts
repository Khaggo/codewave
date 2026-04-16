import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoyaltyAccountResponseDto {
  @ApiProperty({
    example: '4d18cf50-617d-42de-9df4-d7cd2945ce7c',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: 131,
  })
  pointsBalance!: number;

  @ApiProperty({
    example: 231,
  })
  lifetimePointsEarned!: number;

  @ApiProperty({
    example: 100,
  })
  lifetimePointsRedeemed!: number;

  @ApiPropertyOptional({
    example: '2026-05-14T09:00:00.000Z',
    format: 'date-time',
  })
  lastAccruedAt?: string | null;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-14T09:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
