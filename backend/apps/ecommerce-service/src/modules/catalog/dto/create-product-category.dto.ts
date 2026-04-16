import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductCategoryDto {
  @ApiProperty({
    example: 'Engine Parts',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'engine-parts',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  @Matches(slugPattern, {
    message: 'slug must use lowercase letters, numbers, and hyphens only',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Sellable engine-related service parts and consumables.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
