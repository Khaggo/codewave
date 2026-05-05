import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiWorkerJobResponseDto } from '@shared/queue/ai-worker-job-response.dto';

import { qualityGateStatusEnum } from '../schemas/quality-gates.schema';
import { QualityGateFindingResponseDto } from './quality-gate-finding-response.dto';
import { QualityGateOverrideResponseDto } from './quality-gate-override-response.dto';

export class JobOrderQualityGateResponseDto {
  @ApiProperty({
    example: 'f0cb4d65-f517-40ce-b0d4-7eb22e9f8f21',
  })
  id!: string;

  @ApiProperty({
    example: 'd233949f-c8a4-4870-93c8-c8cb0bd742e9',
  })
  jobOrderId!: string;

  @ApiProperty({
    enum: qualityGateStatusEnum.enumValues,
    example: 'blocked',
  })
  status!: (typeof qualityGateStatusEnum.enumValues)[number];

  @ApiProperty({
    example: 85,
  })
  riskScore!: number;

  @ApiPropertyOptional({
    example: 'Quality gate found blocking issues that must be resolved before release.',
  })
  blockingReason?: string | null;

  @ApiProperty({
    enum: ['pending', 'completed', 'unavailable'],
    example: 'completed',
  })
  preCheckStatus!: 'pending' | 'completed' | 'unavailable';

  @ApiPropertyOptional({
    example: {
      completedWorkItemCount: 3,
      totalWorkItemCount: 3,
      attachedPhotoCount: 4,
      evidenceGapCount: 1,
      semanticMatchScore: 82,
      evidenceGaps: ['No completion inspection linked yet.'],
      inspectionDiscrepancies: [],
      automatedRecommendation: 'ready_for_review',
      infrastructureState: 'available',
    },
  })
  preCheckSummary?: Record<string, unknown> | null;

  @ApiProperty({
    enum: ['pending', 'passed', 'blocked'],
    example: 'passed',
  })
  reviewerVerdict!: 'pending' | 'passed' | 'blocked';

  @ApiPropertyOptional({
    example: 'Physical inspection matched the work and the customer concern.',
  })
  reviewerNote?: string | null;

  @ApiPropertyOptional({
    example: '7f0c0000-1111-2222-3333-444444444444',
  })
  headTechnicianUserId?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T10:31:00.000Z',
    format: 'date-time',
  })
  reviewedAt?: string | null;

  @ApiProperty({
    example: '2026-05-06T08:00:00.000Z',
    format: 'date-time',
  })
  lastAuditRequestedAt!: string;

  @ApiPropertyOptional({
    example: '2026-05-06T08:00:05.000Z',
    format: 'date-time',
  })
  lastAuditCompletedAt?: string | null;

  @ApiPropertyOptional({
    type: () => AiWorkerJobResponseDto,
  })
  auditJob?: AiWorkerJobResponseDto | null;

  @ApiProperty({
    example: '2026-05-06T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-06T08:00:05.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiProperty({
    type: () => QualityGateFindingResponseDto,
    isArray: true,
  })
  findings!: QualityGateFindingResponseDto[];

  @ApiProperty({
    type: () => QualityGateOverrideResponseDto,
    isArray: true,
  })
  overrides!: QualityGateOverrideResponseDto[];
}
