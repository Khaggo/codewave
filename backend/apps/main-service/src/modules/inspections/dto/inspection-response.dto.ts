import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { inspectionStatusEnum, inspectionTypeEnum } from '../schemas/inspections.schema';

import { InspectionFindingResponseDto } from './inspection-finding-response.dto';
import { InspectionEvidenceResponseDto } from './inspection-evidence-response.dto';

export class InspectionResponseDto {
  @ApiProperty({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  })
  id!: string;

  @ApiProperty({ example: 'INSP-2026-000001' })
  inspectionReference!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiPropertyOptional({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  bookingId?: string | null;

  @ApiProperty({
    enum: inspectionTypeEnum.enumValues,
    example: 'completion',
  })
  inspectionType!: string;

  @ApiProperty({
    enum: inspectionStatusEnum.enumValues,
    example: 'completed',
  })
  status!: string;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  inspectorUserId?: string | null;

  @ApiPropertyOptional({
    example: 'Vehicle condition documented before release.',
  })
  notes?: string | null;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['upload://vehicle/photo-1'],
  })
  attachmentRefs!: string[];

  @ApiPropertyOptional({ type: Object, nullable: true })
  intakeData?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  intakeDataVersion?: number | null;

  @ApiProperty({
    example: false,
    description: 'True when the row predates structured intake data and remains read-only compatible.',
  })
  legacyRecord!: boolean;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  completedAt?: string | null;

  @ApiPropertyOptional({
    type: () => InspectionEvidenceResponseDto,
    isArray: true,
  })
  evidence?: InspectionEvidenceResponseDto[];

  @ApiPropertyOptional({
    type: () => InspectionFindingResponseDto,
    isArray: true,
  })
  findings?: InspectionFindingResponseDto[];

  @ApiProperty({
    example: '2026-04-13T09:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-13T09:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
