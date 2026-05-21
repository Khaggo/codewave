import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiPropertyOptional({
    example: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
    nullable: true,
    description: 'Optional service category identifier. Leave empty to create an uncategorized service.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: 'Oil Change',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Replace engine oil and inspect basic consumables.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: 85000,
    minimum: 0,
    description: 'Base labor/service price in centavos for pricing and quote visibility.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePriceCents!: number;

  @ApiProperty({
    example: 45,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
