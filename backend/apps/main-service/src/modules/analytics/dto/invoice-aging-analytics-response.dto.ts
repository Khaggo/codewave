import { ApiProperty } from '@nestjs/swagger';

class InvoiceAgingAnalyticsTotalsResponseDto {
  @ApiProperty({ example: 4 })
  trackedInvoices!: number;

  @ApiProperty({ example: 2 })
  scheduledReminderRules!: number;

  @ApiProperty({ example: 1 })
  processedReminderRules!: number;

  @ApiProperty({ example: 1 })
  cancelledReminderRules!: number;
}

class InvoiceAgingAnalyticsBucketResponseDto {
  @ApiProperty({ example: 'overdue_1_7' })
  bucket!: string;

  @ApiProperty({ example: 2 })
  count!: number;
}

class InvoiceAgingAnalyticsInvoiceEntryResponseDto {
  @ApiProperty({ example: 'invoice-123' })
  invoiceId!: string;

  @ApiProperty({ example: 'scheduled' })
  latestReminderStatus!: string;

  @ApiProperty({ example: '2026-04-14T09:00:00.000Z' })
  latestScheduledFor!: string;

  @ApiProperty({ example: ['rule-1', 'rule-2'], type: [String] })
  reminderRuleIds!: string[];
}

export class InvoiceAgingAnalyticsResponseDto {
  @ApiProperty({ example: '2026-04-16T15:41:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '1d0296aa-7b28-48e7-a3df-8d0b2260b1d5' })
  refreshJobId!: string;

  @ApiProperty({ type: () => InvoiceAgingAnalyticsTotalsResponseDto })
  totals!: InvoiceAgingAnalyticsTotalsResponseDto;

  @ApiProperty({ type: () => InvoiceAgingAnalyticsBucketResponseDto, isArray: true })
  agingBuckets!: InvoiceAgingAnalyticsBucketResponseDto[];

  @ApiProperty({ type: () => InvoiceAgingAnalyticsInvoiceEntryResponseDto, isArray: true })
  trackedInvoicePolicies!: InvoiceAgingAnalyticsInvoiceEntryResponseDto[];
}
