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
    example: 'https://files.example.com/job-orders/before-repair.jpg',
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
}
