import { ApiProperty } from '@nestjs/swagger';

export class BookingWorkshopHandoffResponseDto {
  @ApiProperty({
    example: '9b03bdc9-6998-42bb-a4ea-e4154946169f',
    format: 'uuid',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: 'JO · BK-20260724-0003',
  })
  reference!: string;

  @ApiProperty({
    example: true,
    description: 'True when this request created the job order; false when it reopened an existing one.',
  })
  created!: boolean;
}
