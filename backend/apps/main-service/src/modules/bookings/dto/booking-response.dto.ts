import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { bookingStatusEnum } from '../schemas/bookings.schema';

import { BookingReservationPaymentResponseDto } from './booking-reservation-payment-response.dto';
import { BookingServiceResponseDto } from './booking-service-response.dto';
import { BookingStatusHistoryResponseDto } from './booking-status-history-response.dto';
import { TimeSlotResponseDto } from './time-slot-response.dto';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export class BookingResponseDto {
  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  timeSlotId!: string;

  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    enum: bookingStatusEnum.enumValues,
    example: 'pending',
  })
  status!: BookingStatus;

  @ApiPropertyOptional({
    example: 'Please double-check the front brakes during the visit.',
  })
  notes?: string | null;

  @ApiPropertyOptional({
    example: 'Jamie Driver',
  })
  customerName?: string | null;

  @ApiPropertyOptional({
    example: 'booking-owner@example.com',
  })
  customerEmail?: string | null;

  @ApiPropertyOptional({
    example: '2022 Toyota Vios',
  })
  vehicleDisplayName?: string | null;

  @ApiPropertyOptional({
    example: 'BKG1234',
  })
  plateNumber?: string | null;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: () => TimeSlotResponseDto,
  })
  timeSlot?: TimeSlotResponseDto;

  @ApiPropertyOptional({
    type: () => BookingServiceResponseDto,
    isArray: true,
  })
  requestedServices?: BookingServiceResponseDto[];

  @ApiPropertyOptional({
    type: () => BookingStatusHistoryResponseDto,
    isArray: true,
  })
  statusHistory?: BookingStatusHistoryResponseDto[];

  @ApiPropertyOptional({
    type: () => BookingReservationPaymentResponseDto,
  })
  reservationPayment?: BookingReservationPaymentResponseDto | null;
}
