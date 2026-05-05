import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { jobOrderProgressEntryTypeEnum } from '../schemas/job-orders.schema';

export class JobOrderProgressEntryResponseDto {
  @ApiProperty({
    example: 'edc6a182-575b-4e35-aef5-7f26372d8eb5',
  })
  id!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: '61539ebf-e98a-45da-aa0d-a19acded1d7f',
  })
  technicianUserId!: string;

  @ApiProperty({
    enum: jobOrderProgressEntryTypeEnum.enumValues,
    example: 'work_started',
  })
  entryType!: (typeof jobOrderProgressEntryTypeEnum.enumValues)[number];

  @ApiProperty({
    example: 'Started engine diagnostics and initial disassembly.',
  })
  message!: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['8bcb97fe-0aa4-4c68-ae49-2f58c4526529'],
  })
  completedItemIds?: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    example: ['985a8d3f-a4db-4197-8720-fd23676d4344'],
  })
  attachedPhotoIds?: string[];

  @ApiProperty({
    example: '2026-04-13T10:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
