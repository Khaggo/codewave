import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { insuranceDocumentTypeEnum } from '../schemas/insurance.schema';

export class InsuranceDocumentResponseDto {
  @ApiProperty({
    example: 'damage-photo-front.jpg',
  })
  fileName!: string;

  @ApiProperty({
    example: '/api/insurance/documents/4d1b2c47-c5e2-44a8-9180-4096ea4c9d05/file',
    description: 'Authorized API route. Storage locations are never exposed.',
  })
  downloadRoute!: string;

  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    example: 'photo',
  })
  documentType!: (typeof insuranceDocumentTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Front bumper damage before estimate review.',
  })
  notes?: string | null;

  @ApiProperty({
    example: '2026-04-22T09:31:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-22T09:31:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
