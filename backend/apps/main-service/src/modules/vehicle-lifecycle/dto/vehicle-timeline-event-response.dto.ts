import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  vehicleTimelineEventCategoryEnum,
  vehicleTimelineSourceTypeEnum,
} from '../schemas/vehicle-lifecycle.schema';

export class VehicleTimelineEventResponseDto {
  @ApiProperty({
    example: '99c6281e-c8b1-44de-a0e3-c14fcfb6c357',
  })
  id!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  vehicleId!: string;

  @ApiProperty({
    example: 'booking_confirmed',
  })
  eventType!: string;

  @ApiProperty({
    enum: vehicleTimelineEventCategoryEnum.enumValues,
    example: 'administrative',
  })
  eventCategory!: string;

  @ApiProperty({
    enum: vehicleTimelineSourceTypeEnum.enumValues,
    example: 'booking',
  })
  sourceType!: string;

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  sourceId!: string;

  @ApiProperty({
    example: '2026-04-13T09:00:00.000Z',
    format: 'date-time',
  })
  occurredAt!: string;

  @ApiProperty({
    example: false,
  })
  verified!: boolean;

  @ApiPropertyOptional({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
  })
  inspectionId?: string | null;

  @ApiPropertyOptional({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  actorUserId?: string | null;

  @ApiPropertyOptional({
    example: 'Staff approved the slot.',
  })
  notes?: string | null;

  @ApiProperty({
    example: 'booking:b520dba5-5bfb-4d34-a931-70bd811f7725:history:9759fe0a-f2db-4728-99c0-fd4b1e170733',
  })
  dedupeKey!: string;

  @ApiProperty({
    example: '2026-04-13T09:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-04-13T09:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
