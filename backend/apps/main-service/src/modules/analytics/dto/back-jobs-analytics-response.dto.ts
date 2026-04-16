import { ApiProperty } from '@nestjs/swagger';

class BackJobsAnalyticsTotalsResponseDto {
  @ApiProperty({ example: 6 })
  totalBackJobs!: number;

  @ApiProperty({ example: 3 })
  openBackJobs!: number;

  @ApiProperty({ example: 2 })
  resolvedBackJobs!: number;

  @ApiProperty({ example: 4 })
  validatedFindings!: number;
}

class BackJobsAnalyticsStatusCountResponseDto {
  @ApiProperty({ example: 'reported' })
  status!: string;

  @ApiProperty({ example: 2 })
  count!: number;
}

class BackJobsAnalyticsSeverityCountResponseDto {
  @ApiProperty({ example: 'high' })
  severity!: string;

  @ApiProperty({ example: 3 })
  count!: number;
}

class BackJobsAnalyticsSourceEntryResponseDto {
  @ApiProperty({ example: '4382f56d-35ab-4b8b-8fca-879741a0ad67' })
  originalJobOrderId!: string;

  @ApiProperty({ example: 2 })
  backJobCount!: number;

  @ApiProperty({ example: 1 })
  unresolvedCount!: number;

  @ApiProperty({ example: ['back-job-1', 'back-job-2'], type: [String] })
  sourceBackJobIds!: string[];
}

export class BackJobsAnalyticsResponseDto {
  @ApiProperty({ example: '2026-04-16T15:41:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '1d0296aa-7b28-48e7-a3df-8d0b2260b1d5' })
  refreshJobId!: string;

  @ApiProperty({ type: () => BackJobsAnalyticsTotalsResponseDto })
  totals!: BackJobsAnalyticsTotalsResponseDto;

  @ApiProperty({ type: () => BackJobsAnalyticsStatusCountResponseDto, isArray: true })
  statuses!: BackJobsAnalyticsStatusCountResponseDto[];

  @ApiProperty({ type: () => BackJobsAnalyticsSeverityCountResponseDto, isArray: true })
  severities!: BackJobsAnalyticsSeverityCountResponseDto[];

  @ApiProperty({ type: () => BackJobsAnalyticsSourceEntryResponseDto, isArray: true })
  repeatSources!: BackJobsAnalyticsSourceEntryResponseDto[];
}
