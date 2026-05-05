import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { jobOrderSourceTypeEnum, jobOrderStatusEnum, jobOrderTypeEnum } from '../schemas/job-orders.schema';

import { JobOrderAssignmentResponseDto } from './job-order-assignment-response.dto';
import { JobOrderInvoiceRecordResponseDto } from './job-order-invoice-record-response.dto';
import { JobOrderItemResponseDto } from './job-order-item-response.dto';
import { JobOrderPhotoResponseDto } from './job-order-photo-response.dto';
import { JobOrderProgressEntryResponseDto } from './job-order-progress-entry-response.dto';

class JobOrderFinalizationReadinessDto {
  @ApiProperty({
    example: true,
  })
  canFinalize!: boolean;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['Head-technician verdict is missing.'],
  })
  blockers!: string[];

  @ApiPropertyOptional({
    example: 'Oil changed, filter replaced, and final inspection passed.',
  })
  suggestedSummary?: string | null;
}

class JobOrderHeadTechnicianVerdictDto {
  @ApiProperty({
    enum: ['pending', 'passed', 'blocked'],
    example: 'passed',
  })
  verdict!: 'pending' | 'passed' | 'blocked';

  @ApiPropertyOptional({
    example: 'Physical inspection matched the completed work.',
  })
  note?: string | null;

  @ApiPropertyOptional({
    example: '7f0c0000-1111-2222-3333-444444444444',
  })
  reviewerUserId?: string | null;

  @ApiPropertyOptional({
    example: '2026-05-05T10:30:00.000Z',
    format: 'date-time',
  })
  reviewedAt?: string | null;
}

export class JobOrderResponseDto {
  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  id!: string;

  @ApiProperty({
    enum: jobOrderSourceTypeEnum.enumValues,
    example: 'booking',
  })
  sourceType!: (typeof jobOrderSourceTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  sourceId!: string;

  @ApiProperty({
    enum: jobOrderTypeEnum.enumValues,
    example: 'normal',
  })
  jobType!: (typeof jobOrderTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'a2306e3a-4274-4d49-b87e-1d39e1d79c54',
  })
  parentJobOrderId?: string | null;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  customerUserId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: '5d9be480-c0be-4cc2-b89d-5c2ad7fc1c4d',
  })
  serviceAdviserUserId!: string;

  @ApiProperty({
    example: 'SA-1001',
  })
  serviceAdviserCode!: string;

  @ApiProperty({
    enum: jobOrderStatusEnum.enumValues,
    example: 'assigned',
  })
  status!: (typeof jobOrderStatusEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Customer reported engine noise after cold start.',
  })
  notes?: string | null;

  @ApiProperty({
    example: '2026-04-13T09:15:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-13T09:15:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiProperty({
    type: () => JobOrderItemResponseDto,
    isArray: true,
  })
  items!: JobOrderItemResponseDto[];

  @ApiProperty({
    type: () => JobOrderAssignmentResponseDto,
    isArray: true,
  })
  assignments!: JobOrderAssignmentResponseDto[];

  @ApiProperty({
    type: () => JobOrderProgressEntryResponseDto,
    isArray: true,
  })
  progressEntries!: JobOrderProgressEntryResponseDto[];

  @ApiProperty({
    type: () => JobOrderPhotoResponseDto,
    isArray: true,
  })
  photos!: JobOrderPhotoResponseDto[];

  @ApiPropertyOptional({
    type: () => JobOrderInvoiceRecordResponseDto,
  })
  invoiceRecord?: JobOrderInvoiceRecordResponseDto | null;

  @ApiPropertyOptional({
    type: () => JobOrderHeadTechnicianVerdictDto,
  })
  headTechnicianVerdict?: JobOrderHeadTechnicianVerdictDto | null;

  @ApiPropertyOptional({
    type: () => JobOrderFinalizationReadinessDto,
  })
  finalizationReadiness?: JobOrderFinalizationReadinessDto | null;
}
