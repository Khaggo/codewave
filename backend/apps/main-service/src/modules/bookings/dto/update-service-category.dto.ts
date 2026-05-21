import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateServiceCategoryDto } from './create-service-category.dto';

export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {
  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
