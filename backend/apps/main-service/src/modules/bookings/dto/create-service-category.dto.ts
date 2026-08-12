import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty({
    example: 'Preventive Maintenance',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'name must contain a non-whitespace character' })
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Routine maintenance bundles and recurring upkeep work.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
