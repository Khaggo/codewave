import { ApiProperty } from '@nestjs/swagger';

import { jobOrderSourceTypeEnum, jobOrderStatusEnum } from '../schemas/job-orders.schema';

export class JobOrderWorkbenchSummaryResponseDto {
  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  id!: string;

  @ApiProperty({
    enum: jobOrderStatusEnum.enumValues,
    example: 'assigned',
  })
  status!: (typeof jobOrderStatusEnum.enumValues)[number];

  @ApiProperty({
    enum: jobOrderSourceTypeEnum.enumValues,
    example: 'booking',
  })
  sourceType!: (typeof jobOrderSourceTypeEnum.enumValues)[number];

  @ApiProperty({
    example: '2026-05-02',
    description:
      'Date used by the workbench calendar. Booking-sourced job orders use booking scheduledDate; other sources fall back to creation date.',
  })
  workDate!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: 'SA-1001',
  })
  serviceAdviserCode!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['5d9be480-c0be-4cc2-b89d-5c2ad7fc1c4d'],
  })
  assignedTechnicianIds!: string[];

  @ApiProperty({
    example: '2026-05-02T11:15:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
