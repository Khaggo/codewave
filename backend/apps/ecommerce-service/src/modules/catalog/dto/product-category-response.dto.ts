import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductCategoryResponseDto {
  @ApiProperty({
    example: '8d7f1cb6-0ca9-4d8b-b65a-b909fd390f02',
  })
  id!: string;

  @ApiProperty({
    example: 'Engine Parts',
  })
  name!: string;

  @ApiProperty({
    example: 'engine-parts',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Sellable engine-related service parts and consumables.',
  })
  description?: string | null;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2026-05-12T03:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-12T03:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
