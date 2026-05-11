import { ApiProperty } from '@nestjs/swagger';

export class UploadInspectionPhotoResponseDto {
  @ApiProperty({
    example: 'front',
    description: 'Slot label associated with the uploaded inspection photo.',
  })
  slot!: string;

  @ApiProperty({
    example: 'upload://vehicle/7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d/front/1f5bc7f9-2d87-4d5f-9a5c-1d28a4d4367a.jpg',
    description: 'Attachment reference that can be stored on an inspection record later.',
  })
  attachmentRef!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d/front/1f5bc7f9-2d87-4d5f-9a5c-1d28a4d4367a.jpg',
    description: 'Relative storage path for the persisted image.',
  })
  storageKey!: string;
}
