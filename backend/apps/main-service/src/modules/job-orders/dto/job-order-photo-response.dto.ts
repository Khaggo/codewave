import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobOrderPhotoResponseDto {
  @ApiProperty({
    example: '985a8d3f-a4db-4197-8720-fd23676d4344',
  })
  id!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: '61539ebf-e98a-45da-aa0d-a19acded1d7f',
  })
  takenByUserId!: string;

  @ApiProperty({
    example: 'before-repair.jpg',
  })
  fileName!: string;

  @ApiProperty({
    enum: ['job_order', 'progress_entry', 'work_item', 'qa_review'],
    example: 'work_item',
  })
  linkedEntityType!: 'job_order' | 'progress_entry' | 'work_item' | 'qa_review';

  @ApiPropertyOptional({
    example: '8bcb97fe-0aa4-4c68-ae49-2f58c4526529',
  })
  linkedEntityId?: string | null;

  @ApiProperty({
    example: 'job-orders/7bc8926d-8eb7-4c97-85ab-4597a58e1f43/985a8d3f-a4db-4197-8720-fd23676d4344.jpg',
  })
  storageKey!: string;

  @ApiProperty({
    example: 'image/jpeg',
  })
  mimeType!: string;

  @ApiProperty({
    example: 182230,
  })
  fileSizeBytes!: number;

  @ApiProperty({
    example: '/api/job-orders/photos/985a8d3f-a4db-4197-8720-fd23676d4344/file',
  })
  fileUrl!: string;

  @ApiPropertyOptional({
    example: 'Visible leak near the oil pan gasket.',
  })
  caption?: string | null;

  @ApiProperty({
    example: '2026-04-13T10:05:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiPropertyOptional({
    example: null,
    format: 'date-time',
  })
  deletedAt?: string | null;
}
