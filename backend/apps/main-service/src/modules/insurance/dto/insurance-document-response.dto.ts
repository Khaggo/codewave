import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { insuranceDocumentTypeEnum } from '../schemas/insurance.schema';

export class InsuranceDocumentResponseDto {
  @ApiProperty({
    example: '4d1b2c47-c5e2-44a8-9180-4096ea4c9d05',
  })
  id!: string;

  @ApiProperty({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  inquiryId!: string;

  @ApiProperty({
    example: 'damage-photo-front.jpg',
  })
  fileName!: string;

  @ApiProperty({
    example: 'https://files.autocare.local/insurance/damage-photo-front.jpg',
  })
  fileUrl!: string;

  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    example: 'photo',
  })
  documentType!: (typeof insuranceDocumentTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Front bumper damage before estimate review.',
  })
  notes?: string | null;

  @ApiPropertyOptional({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  })
  uploadedByUserId?: string | null;

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
