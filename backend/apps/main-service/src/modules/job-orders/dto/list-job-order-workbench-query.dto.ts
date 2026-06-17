import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export class ListJobOrderWorkbenchQueryDto {
  @ApiPropertyOptional({
    example: '2026-05',
    description: 'Optional month filter in YYYY-MM format for job-order workbench calendar and selector data.',
  })
  @IsOptional()
  @Matches(MONTH_PATTERN, {
    message: 'month must use YYYY-MM format',
  })
  month?: string;
}
