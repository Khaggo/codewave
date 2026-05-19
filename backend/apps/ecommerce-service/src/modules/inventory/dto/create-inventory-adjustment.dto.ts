import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @ApiProperty({
    example: 5,
    description: 'Positive adds stock, negative removes stock.',
  })
  @IsInt()
  quantityDelta!: number;

  @ApiPropertyOptional({
    example: 'Cycle count reconciliation after supplier delivery.',
    maxLength: 240,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason?: string;
}
