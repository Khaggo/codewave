import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { inspectionFindingSeverityEnum } from '../schemas/inspections.schema';

export class InspectionFindingResponseDto {
  @ApiProperty({
    example: '7e6952bf-f72e-4f84-97b5-61dbef2ca4cc',
  })
  id!: string;

  @ApiProperty({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  })
  inspectionId!: string;

  @ApiProperty({
    example: 'body',
  })
  category!: string;

  @ApiProperty({
    example: 'Front bumper scratches',
  })
  label!: string;

  @ApiProperty({
    enum: inspectionFindingSeverityEnum.enumValues,
    example: 'medium',
  })
  severity!: string;

  @ApiPropertyOptional({
    example: 'Visible scratch marks on the lower right side.',
  })
  notes?: string | null;

  @ApiProperty({
    example: false,
  })
  isVerified!: boolean;

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
