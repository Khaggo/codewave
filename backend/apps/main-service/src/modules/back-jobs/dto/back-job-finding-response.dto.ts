import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { backJobFindingSeverityEnum } from '../schemas/back-jobs.schema';

export class BackJobFindingResponseDto {
  @ApiProperty({
    example: 'f6adbc0a-7d37-4f14-a2b4-ef905e8ab7ac',
  })
  id!: string;

  @ApiProperty({
    example: 'd6eaf1eb-6502-44fd-b1db-2e49f37ad6c6',
  })
  backJobId!: string;

  @ApiProperty({
    example: 'engine',
  })
  category!: string;

  @ApiProperty({
    example: 'Oil leak persisted after previous repair',
  })
  label!: string;

  @ApiProperty({
    enum: backJobFindingSeverityEnum.enumValues,
    example: 'high',
  })
  severity!: string;

  @ApiPropertyOptional({
    example: 'Leak remains visible around the valve cover area.',
  })
  notes?: string | null;

  @ApiProperty({
    example: true,
  })
  isValidated!: boolean;

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
