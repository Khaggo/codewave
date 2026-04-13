import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({
    example: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
  })
  id!: string;

  @ApiPropertyOptional({
    example: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
  })
  categoryId?: string | null;

  @ApiProperty({
    example: 'Oil Change',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Replace engine oil and inspect basic consumables.',
  })
  description?: string | null;

  @ApiProperty({
    example: 45,
  })
  durationMinutes!: number;

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
