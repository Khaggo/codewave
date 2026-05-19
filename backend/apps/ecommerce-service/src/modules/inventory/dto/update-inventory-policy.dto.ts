import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventoryPolicyDto {
  @ApiPropertyOptional({
    example: 4,
    minimum: 0,
    description: 'Low-stock warning threshold for the selected product.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @ApiPropertyOptional({
    example: 12,
    minimum: 0,
    description: 'Direct quantity overwrite used by staff when reconciling a stock count.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityOnHand?: number;
}
