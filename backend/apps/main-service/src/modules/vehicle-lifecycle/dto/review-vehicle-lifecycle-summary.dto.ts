import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const reviewDecisionValues = ['approved', 'rejected'] as const;

export class ReviewVehicleLifecycleSummaryDto {
  @ApiProperty({
    enum: reviewDecisionValues,
    example: 'approved',
  })
  @IsIn(reviewDecisionValues)
  decision!: (typeof reviewDecisionValues)[number];

  @ApiPropertyOptional({
    example: 'Reviewed against the verified lifecycle evidence and approved for customer visibility.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}
