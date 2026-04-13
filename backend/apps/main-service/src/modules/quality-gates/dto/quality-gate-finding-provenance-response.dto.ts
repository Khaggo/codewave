import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QualityGateFindingProvenanceResponseDto {
  @ApiProperty({
    example: 'local-rule-auditor',
  })
  provider!: string;

  @ApiProperty({
    example: 'token-overlap-v1',
  })
  model!: string;

  @ApiProperty({
    example: 'quality-gates.gate1.v1',
  })
  promptVersion!: string;

  @ApiPropertyOptional({
    example: 'gate_2.verified_high_severity_unresolved',
  })
  ruleId?: string;

  @ApiProperty({
    enum: ['booking', 'back_job'],
    example: 'booking',
  })
  sourceType!: 'booking' | 'back_job';

  @ApiProperty({
    enum: ['supported', 'review_needed', 'insufficient_context'],
    example: 'supported',
  })
  recommendation!: 'supported' | 'review_needed' | 'insufficient_context';

  @ApiProperty({
    enum: ['high', 'medium', 'low'],
    example: 'medium',
  })
  confidence!: 'high' | 'medium' | 'low';

  @ApiProperty({
    example: 'Engine rattling noise during cold start; requested service: Engine Diagnostics.',
  })
  concernSummary!: string;

  @ApiProperty({
    example: 'Completed items and progress reference the engine rattle diagnosis and cold-start check.',
  })
  completedWorkSummary!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['engine', 'rattl', 'cold', 'start'],
  })
  matchedKeywords!: string[];

  @ApiProperty({
    example: 0.57,
  })
  coverageRatio!: number;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['inspection:9d0e2f53-caf0-433a-91eb-965ecf917146', 'inspection-finding:2d9d18c1-8fb2-4175-bc8d-8f955fbff4cf'],
  })
  evidenceRefs?: string[];

  @ApiPropertyOptional({
    example: 'Completion inspection 9d0e2f53-caf0-433a-91eb-965ecf917146 contains a verified high-severity finding with weak overlap to the completed work narrative.',
  })
  evidenceSummary?: string;

  @ApiPropertyOptional({
    example: 75,
  })
  riskContribution?: number;
}
