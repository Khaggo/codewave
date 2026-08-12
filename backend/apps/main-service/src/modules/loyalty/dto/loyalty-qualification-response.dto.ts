import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoyaltyQualificationResponseDto {
  @ApiProperty({ enum: ['qualified', 'not_qualified'] })
  status!: 'qualified' | 'not_qualified';

  @ApiPropertyOptional({ example: 'VEH-2026-000123' })
  vehiclePublicReference!: string | null;

  @ApiPropertyOptional({ example: 'Toyota Corolla (2021)' })
  vehicleLabel!: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  lastVerifiedAt!: string | null;

  @ApiProperty({ enum: ['sticker_verified', 'sticker_not_present', 'no_completed_observation'] })
  reasonCategory!: 'sticker_verified' | 'sticker_not_present' | 'no_completed_observation';
}
