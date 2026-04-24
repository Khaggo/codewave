import { ApiProperty } from '@nestjs/swagger';

import { bookingStatusEnum } from '../schemas/bookings.schema';

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export class QueueCurrentItemResponseDto {
  @ApiProperty({
    example: 1,
  })
  queuePosition!: number;

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  bookingId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: 'Jamie Driver',
    required: false,
  })
  customerName?: string | null;

  @ApiProperty({
    example: 'booking-owner@example.com',
    required: false,
  })
  customerEmail?: string | null;

  @ApiProperty({
    example: '2022 Toyota Vios',
    required: false,
  })
  vehicleDisplayName?: string | null;

  @ApiProperty({
    example: 'BKG1234',
    required: false,
  })
  plateNumber?: string | null;

  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  timeSlotId!: string;

  @ApiProperty({
    example: 'Morning Slot',
  })
  timeSlotLabel!: string;

  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    enum: bookingStatusEnum.enumValues,
    example: 'confirmed',
  })
  status!: BookingStatus;
}
