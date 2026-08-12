import { ApiProperty } from '@nestjs/swagger';

export class InspectionEvidenceResponseDto {
  @ApiProperty({ example: '7e6952bf-f72e-4f84-97b5-61dbef2ca4cc' })
  id!: string;

  @ApiProperty({ example: 'front' })
  slot!: string;

  @ApiProperty({ example: 'front-arrival.jpg' })
  originalName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 483922 })
  byteSize!: number;

  @ApiProperty({ example: '/api/intake-inspections/inspection-id/evidence/evidence-id/file' })
  fileUrl!: string;

  @ApiProperty({ example: '2026-04-13T09:00:00.000Z', format: 'date-time' })
  createdAt!: string;
}
