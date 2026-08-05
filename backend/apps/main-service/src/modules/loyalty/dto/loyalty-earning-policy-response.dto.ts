import { ApiProperty } from '@nestjs/swagger';

export class LoyaltyEarningPolicyRequirementDto {
  @ApiProperty({
    example: 'Earn 1 point for every PHP 100.00 paid on an eligible service.',
  })
  formula!: string;

  @ApiProperty({
    example: 'Payment must be settled for a service invoice. A minimum payment of PHP 100.00 applies.',
  })
  eligibility!: string;
}

export class LoyaltyEarningPolicyResponseDto {
  @ApiProperty({
    example: 'Points are earned after eligible paid service invoices are settled.',
  })
  summary!: string;

  @ApiProperty({
    type: () => LoyaltyEarningPolicyRequirementDto,
    isArray: true,
  })
  requirements!: LoyaltyEarningPolicyRequirementDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['Accessory purchases are not currently eligible for loyalty points.'],
  })
  exclusions!: string[];
}
