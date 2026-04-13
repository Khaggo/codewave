import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { vehicleLifecycleSummaryStatusEnum } from '../schemas/vehicle-lifecycle.schema';

export class VehicleLifecycleSummaryProvenanceResponseDto {
  @ApiProperty({
    example: 'local-summary-adapter',
  })
  provider!: string;

  @ApiProperty({
    example: 'timeline-summary-v1',
  })
  model!: string;

  @ApiProperty({
    example: 'vehicle-lifecycle.summary.v1',
  })
  promptVersion!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['booking:booking-1:history:history-1', 'inspection:inspection-1:completed'],
  })
  evidenceRefs!: string[];

  @ApiProperty({
    example: 'Evidence is limited to normalized timeline milestones and verified inspection-backed lifecycle records.',
  })
  evidenceSummary!: string;
}

export class VehicleLifecycleSummaryResponseDto {
  @ApiProperty({
    example: '3f50eb2d-b8d8-476a-a0ea-6dcbc09087ee',
  })
  id!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  requestedByUserId!: string;

  @ApiProperty({
    example:
      'This vehicle has a recorded service history that includes appointment intake milestones and verified inspection evidence. The most recent verified service check completed successfully and there are no pending customer-visible release issues in this summary draft.',
  })
  summaryText!: string;

  @ApiProperty({
    enum: vehicleLifecycleSummaryStatusEnum.enumValues,
    example: 'pending_review',
  })
  status!: (typeof vehicleLifecycleSummaryStatusEnum.enumValues)[number];

  @ApiProperty({
    example: false,
  })
  customerVisible!: boolean;

  @ApiPropertyOptional({
    example: 'Reviewed against the verified lifecycle evidence and approved for customer visibility.',
  })
  reviewNotes?: string | null;

  @ApiPropertyOptional({
    example: '6cd2cd76-b123-4301-a8e9-18d7fc6ed42a',
  })
  reviewedByUserId?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-10T08:40:00.000Z',
    format: 'date-time',
  })
  reviewedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-10T08:40:00.000Z',
    format: 'date-time',
  })
  customerVisibleAt?: string | null;

  @ApiProperty({
    type: () => VehicleLifecycleSummaryProvenanceResponseDto,
  })
  provenance!: VehicleLifecycleSummaryProvenanceResponseDto;

  @ApiProperty({
    example: '2026-05-10T08:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-10T08:40:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
