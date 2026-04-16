import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RedeemRewardDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    example: '5ec0acb3-d4ed-4378-b0f9-a6fe4c4a741a',
  })
  @IsString()
  rewardId!: string;

  @ApiPropertyOptional({
    example: 'Redeemed during front-desk pickup.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
