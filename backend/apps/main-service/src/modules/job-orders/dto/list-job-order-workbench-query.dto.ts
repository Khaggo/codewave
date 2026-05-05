import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
export const jobOrderWorkbenchScopeValues = ['active', 'history', 'all'] as const;
export type JobOrderWorkbenchScope = (typeof jobOrderWorkbenchScopeValues)[number];

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

  @ApiPropertyOptional({
    enum: jobOrderWorkbenchScopeValues,
    example: 'active',
    description: 'Optional workbench scope. Active hides finalized/cancelled records by default, while history focuses on them.',
  })
  @IsOptional()
  @IsEnum(jobOrderWorkbenchScopeValues)
  scope?: JobOrderWorkbenchScope;
}
