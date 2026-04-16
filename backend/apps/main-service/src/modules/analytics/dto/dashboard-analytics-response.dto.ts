import { ApiProperty } from '@nestjs/swagger';

class DashboardTotalsResponseDto {
  @ApiProperty({ example: 18 })
  totalBookings!: number;

  @ApiProperty({ example: 9 })
  activeBookings!: number;

  @ApiProperty({ example: 7 })
  finalizedServiceInvoices!: number;

  @ApiProperty({ example: 4 })
  insuranceOpenInquiries!: number;

  @ApiProperty({ example: 2 })
  openBackJobs!: number;
}

class DashboardSalesResponseDto {
  @ApiProperty({ example: 7 })
  finalizedInvoiceCount!: number;

  @ApiProperty({ example: 5 })
  bookingInvoiceCount!: number;

  @ApiProperty({ example: 2 })
  backJobInvoiceCount!: number;

  @ApiProperty({ example: 'INV-20260416-001', nullable: true })
  latestInvoiceReference!: string | null;
}

class DashboardInsuranceResponseDto {
  @ApiProperty({ example: 6 })
  totalInquiries!: number;

  @ApiProperty({ example: 3 })
  openInquiries!: number;

  @ApiProperty({ example: 1 })
  needsDocuments!: number;

  @ApiProperty({ example: 1 })
  approvedForRecord!: number;

  @ApiProperty({ example: 1 })
  rejected!: number;
}

class DashboardServiceDemandEntryResponseDto {
  @ApiProperty({ example: '33c8cd7e-8d4a-43aa-8d33-55e03f39577c' })
  serviceId!: string;

  @ApiProperty({ example: 'Oil Change' })
  serviceName!: string;

  @ApiProperty({ example: 8 })
  bookingCount!: number;

  @ApiProperty({ example: ['booking-1', 'booking-2'], type: [String] })
  sourceBookingIds!: string[];
}

class DashboardPeakHourEntryResponseDto {
  @ApiProperty({ example: '4cbfe2c7-c043-4dc2-a13d-eaa0bcb9b33d' })
  timeSlotId!: string;

  @ApiProperty({ example: '08:00 AM - 10:00 AM' })
  label!: string;

  @ApiProperty({ example: '08:00' })
  startTime!: string;

  @ApiProperty({ example: '10:00' })
  endTime!: string;

  @ApiProperty({ example: 5 })
  bookingCount!: number;

  @ApiProperty({ example: 83.33 })
  averageFillPercent!: number;

  @ApiProperty({ example: ['booking-1', 'booking-3'], type: [String] })
  sourceBookingIds!: string[];
}

export class DashboardAnalyticsResponseDto {
  @ApiProperty({ example: '2026-04-16T15:41:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '1d0296aa-7b28-48e7-a3df-8d0b2260b1d5' })
  refreshJobId!: string;

  @ApiProperty({ type: () => DashboardTotalsResponseDto })
  totals!: DashboardTotalsResponseDto;

  @ApiProperty({ type: () => DashboardSalesResponseDto })
  sales!: DashboardSalesResponseDto;

  @ApiProperty({ type: () => DashboardInsuranceResponseDto })
  insurance!: DashboardInsuranceResponseDto;

  @ApiProperty({ type: () => DashboardServiceDemandEntryResponseDto, isArray: true })
  serviceDemandPreview!: DashboardServiceDemandEntryResponseDto[];

  @ApiProperty({ type: () => DashboardPeakHourEntryResponseDto, isArray: true })
  peakHoursPreview!: DashboardPeakHourEntryResponseDto[];
}
