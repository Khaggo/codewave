import { ApiProperty } from '@nestjs/swagger';

import { ServiceResponseDto } from './service-response.dto';

export class BookingServiceResponseDto {
  @ApiProperty({
    example: 'f4dbeafc-d39f-4ec0-8fd8-f91bc253c808',
  })
  id!: string;

  @ApiProperty({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  bookingId!: string;

  @ApiProperty({
    example: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
  })
  serviceId!: string;

  @ApiProperty({
    type: () => ServiceResponseDto,
  })
  service!: ServiceResponseDto;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
