import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceCategoryResponseDto {
  @ApiProperty({
    example: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
  })
  id!: string;

  @ApiProperty({
    example: 'Preventive Maintenance',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Routine maintenance bundles and recurring upkeep work.',
  })
  description?: string | null;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
