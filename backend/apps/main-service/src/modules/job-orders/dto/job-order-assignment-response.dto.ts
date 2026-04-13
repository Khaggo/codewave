import { ApiProperty } from '@nestjs/swagger';

export class JobOrderAssignmentResponseDto {
  @ApiProperty({
    example: '6574e922-dc7e-4621-88d9-1b9228ea3fe1',
  })
  id!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  jobOrderId!: string;

  @ApiProperty({
    example: '61539ebf-e98a-45da-aa0d-a19acded1d7f',
  })
  technicianUserId!: string;

  @ApiProperty({
    example: '2026-04-13T09:30:00.000Z',
    format: 'date-time',
  })
  assignedAt!: string;
}
