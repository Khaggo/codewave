import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { backJobStatusEnum } from '../schemas/back-jobs.schema';

import { BackJobFindingResponseDto } from './back-job-finding-response.dto';

export class BackJobResponseDto {
  @ApiProperty({
    example: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  customerUserId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiPropertyOptional({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  originalBookingId?: string | null;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  originalJobOrderId!: string;

  @ApiPropertyOptional({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  })
  returnInspectionId?: string | null;

  @ApiPropertyOptional({
    example: '0bbfa364-4d50-4b8e-b307-2b2e89903340',
  })
  reworkJobOrderId?: string | null;

  @ApiProperty({
    example: 'Customer reports the same leak two days after the previous repair.',
  })
  complaint!: string;

  @ApiProperty({
    enum: backJobStatusEnum.enumValues,
    example: 'reported',
  })
  status!: string;

  @ApiPropertyOptional({
    example: 'Inspection findings support a warranty rework classification.',
  })
  reviewNotes?: string | null;

  @ApiPropertyOptional({
    example: 'Rework completed and verified with the customer.',
  })
  resolutionNotes?: string | null;

  @ApiProperty({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  })
  createdByUserId!: string;

  @ApiProperty({
    type: () => BackJobFindingResponseDto,
    isArray: true,
  })
  findings!: BackJobFindingResponseDto[];

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
