import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LoyaltyQualificationAuditEntryDto {
  @ApiProperty({ enum: ['verified_present', 'not_present'] })
  observation!: 'verified_present' | 'not_present';

  @ApiProperty({ format: 'date-time' })
  observedAt!: string;

  @ApiProperty()
  intakeReference!: string;

  @ApiPropertyOptional()
  reason!: string | null;
}

export class LoyaltyQualificationAuditResponseDto {
  @ApiProperty({ enum: ['qualified', 'not_qualified'] })
  status!: 'qualified' | 'not_qualified';

  @ApiProperty()
  vehiclePublicReference!: string;

  @ApiProperty()
  vehicleLabel!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  lastVerifiedAt!: string | null;

  @ApiProperty({ enum: ['sticker_verified', 'sticker_not_present'] })
  reasonCategory!: 'sticker_verified' | 'sticker_not_present';

  @ApiProperty({ type: () => LoyaltyQualificationAuditEntryDto, isArray: true })
  history!: LoyaltyQualificationAuditEntryDto[];
}
