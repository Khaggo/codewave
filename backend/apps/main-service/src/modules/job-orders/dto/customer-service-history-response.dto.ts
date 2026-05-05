import { ApiProperty } from '@nestjs/swagger';

export class CustomerServiceHistoryResponseDto {
  @ApiProperty({
    example: 'svc-hist-1',
  })
  id!: string;

  @ApiProperty({
    example: '5e5c598c-039e-4024-9057-35e7a6b768f1',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: 'JO-5E5C598C',
  })
  jobOrderReference!: string;

  @ApiProperty({
    example: '2026-05-04',
    nullable: true,
  })
  bookingDate!: string | null;

  @ApiProperty({
    example: '2026-05-04T03:48:00.000Z',
    format: 'date-time',
  })
  finalizedAt!: string;

  @ApiProperty({
    example: 'vehicle-1',
  })
  vehicleId!: string;

  @ApiProperty({
    example: '2005 Toyota Vios',
    nullable: true,
  })
  vehicleLabel!: string | null;

  @ApiProperty({
    example: ['PMS Service', 'Oil Change'],
    type: [String],
  })
  completedServiceNames!: string[];

  @ApiProperty({
    example: 'finalized',
  })
  status!: 'finalized';
}
