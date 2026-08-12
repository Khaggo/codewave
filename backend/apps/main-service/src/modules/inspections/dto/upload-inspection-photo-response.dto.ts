import { ApiProperty } from '@nestjs/swagger';

export class UploadInspectionPhotoResponseDto {
  @ApiProperty({ example: 'evidence-id' })
  id!: string;

  @ApiProperty({
    example: 'front',
    description: 'Slot label associated with the uploaded inspection photo.',
  })
  slot!: string;

  @ApiProperty({ example: 'vehicle-front.jpg' })
  originalName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 248112 })
  byteSize!: number;

  @ApiProperty({
    example: '/api/intake-inspections/inspection-id/evidence/evidence-id/file',
    description: 'Authenticated file route. Internal storage paths are never returned.',
  })
  fileUrl!: string;
}
