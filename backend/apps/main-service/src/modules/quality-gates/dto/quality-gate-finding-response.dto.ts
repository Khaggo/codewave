import { ApiProperty } from '@nestjs/swagger';

import {
  qualityGateFindingGateEnum,
  qualityGateFindingSeverityEnum,
} from '../schemas/quality-gates.schema';
import { QualityGateFindingProvenanceResponseDto } from './quality-gate-finding-provenance-response.dto';

export class QualityGateFindingResponseDto {
  @ApiProperty({
    example: 'c1cc6e40-7511-4f0d-b03d-9ee1a4e98db8',
  })
  id!: string;

  @ApiProperty({
    example: 'f0cb4d65-f517-40ce-b0d4-7eb22e9f8f21',
  })
  qualityGateId!: string;

  @ApiProperty({
    enum: qualityGateFindingGateEnum.enumValues,
    example: 'foundation',
  })
  gate!: (typeof qualityGateFindingGateEnum.enumValues)[number];

  @ApiProperty({
    enum: qualityGateFindingSeverityEnum.enumValues,
    example: 'critical',
  })
  severity!: (typeof qualityGateFindingSeverityEnum.enumValues)[number];

  @ApiProperty({
    example: 'incomplete_work_items',
  })
  code!: string;

  @ApiProperty({
    example: 'All job-order items must be completed before release can continue.',
  })
  message!: string;

  @ApiProperty({
    type: () => QualityGateFindingProvenanceResponseDto,
    required: false,
    nullable: true,
  })
  provenance?: QualityGateFindingProvenanceResponseDto | null;

  @ApiProperty({
    example: '2026-05-06T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
