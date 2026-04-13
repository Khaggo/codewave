import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FinalizeJobOrderDto {
  @ApiPropertyOptional({
    example: 'All planned work items completed and ready for invoice generation.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;
}
