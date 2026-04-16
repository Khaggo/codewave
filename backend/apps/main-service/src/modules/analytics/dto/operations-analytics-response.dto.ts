import { ApiProperty } from '@nestjs/swagger';

class AnalyticsStatusCountResponseDto {
  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiProperty({ example: 4 })
  count!: number;
}

class AnalyticsServiceDemandEntryResponseDto {
  @ApiProperty({ example: '33c8cd7e-8d4a-43aa-8d33-55e03f39577c' })
  serviceId!: string;

  @ApiProperty({ example: 'Wheel Alignment' })
  serviceName!: string;

  @ApiProperty({ example: 6 })
  bookingCount!: number;

  @ApiProperty({ example: '2026-04-16T10:30:00.000Z' })
  lastBookedAt!: string;

  @ApiProperty({ example: ['booking-1', 'booking-3'], type: [String] })
  sourceBookingIds!: string[];
}

class AnalyticsPeakHourEntryResponseDto {
  @ApiProperty({ example: '4cbfe2c7-c043-4dc2-a13d-eaa0bcb9b33d' })
  timeSlotId!: string;

  @ApiProperty({ example: '10:00 AM - 12:00 PM' })
  label!: string;

  @ApiProperty({ example: '10:00' })
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  endTime!: string;

  @ApiProperty({ example: 7 })
  bookingCount!: number;

  @ApiProperty({ example: 87.5 })
  averageFillPercent!: number;

  @ApiProperty({ example: ['booking-2', 'booking-4'], type: [String] })
  sourceBookingIds!: string[];
}

class AnalyticsServiceAdviserLoadEntryResponseDto {
  @ApiProperty({ example: 'SA-0001' })
  serviceAdviserCode!: string;

  @ApiProperty({ example: '4fd6d233-c252-445e-a458-844a3f850cdc' })
  serviceAdviserUserId!: string;

  @ApiProperty({ example: 5 })
  jobOrderCount!: number;

  @ApiProperty({ example: 2 })
  finalizedCount!: number;
}

export class OperationsAnalyticsResponseDto {
  @ApiProperty({ example: '2026-04-16T15:41:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '1d0296aa-7b28-48e7-a3df-8d0b2260b1d5' })
  refreshJobId!: string;

  @ApiProperty({ type: () => AnalyticsStatusCountResponseDto, isArray: true })
  bookingStatuses!: AnalyticsStatusCountResponseDto[];

  @ApiProperty({ type: () => AnalyticsStatusCountResponseDto, isArray: true })
  jobOrderStatuses!: AnalyticsStatusCountResponseDto[];

  @ApiProperty({ type: () => AnalyticsPeakHourEntryResponseDto, isArray: true })
  peakHours!: AnalyticsPeakHourEntryResponseDto[];

  @ApiProperty({ type: () => AnalyticsServiceDemandEntryResponseDto, isArray: true })
  serviceDemand!: AnalyticsServiceDemandEntryResponseDto[];

  @ApiProperty({ type: () => AnalyticsServiceAdviserLoadEntryResponseDto, isArray: true })
  serviceAdviserLoad!: AnalyticsServiceAdviserLoadEntryResponseDto[];
}
