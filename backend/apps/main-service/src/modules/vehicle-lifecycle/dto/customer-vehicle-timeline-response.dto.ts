import { ApiProperty } from '@nestjs/swagger';

import { customerVehicleTimelineSourceTypes } from './list-customer-vehicle-timeline-query.dto';

export class CustomerVehicleTimelineEventResponseDto {
  @ApiProperty({
    example: 'job_order_completed',
  })
  eventType!: string;

  @ApiProperty({
    enum: customerVehicleTimelineSourceTypes,
    example: 'job_order',
  })
  sourceType!: (typeof customerVehicleTimelineSourceTypes)[number];

  @ApiProperty({
    example: 'Service work completed',
  })
  title!: string;

  @ApiProperty({
    example: 'The workshop marked the service work as complete.',
  })
  summary!: string;

  @ApiProperty({
    example: true,
  })
  verified!: boolean;

  @ApiProperty({
    example: '2026-07-28T08:30:00.000Z',
    format: 'date-time',
  })
  occurredAt!: string;
}

export class CustomerVehicleTimelinePageResponseDto {
  @ApiProperty({
    type: () => CustomerVehicleTimelineEventResponseDto,
    isArray: true,
  })
  items!: CustomerVehicleTimelineEventResponseDto[];

  @ApiProperty({
    example: {
      limit: 20,
      hasNext: true,
      nextCursor: 'eyJ2IjoxLCJvY2N1cnJlZEF0IjoiMjAyNi0wNy0yOFQwODozMDowMC4wMDBaIiwiaWQiOiIuLi4ifQ',
    },
  })
  page!: {
    limit: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
}
