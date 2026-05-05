import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobOrderItemResponseDto {
  @ApiProperty({
    example: '8bcb97fe-0aa4-4c68-ae49-2f58c4526529',
  })
  id!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: 'Replace engine oil and oil filter',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Use the manufacturer-recommended viscosity grade.',
  })
  description?: string | null;

  @ApiPropertyOptional({
    example: 2,
  })
  estimatedHours?: number | null;

  @ApiProperty({
    example: true,
  })
  requiresPhotoEvidence!: boolean;

  @ApiProperty({
    example: false,
  })
  isCompleted!: boolean;
}
