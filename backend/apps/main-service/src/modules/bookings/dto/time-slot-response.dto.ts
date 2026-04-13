import { ApiProperty } from '@nestjs/swagger';

export class TimeSlotResponseDto {
  @ApiProperty({
    example: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  })
  id!: string;

  @ApiProperty({
    example: 'Morning Slot',
  })
  label!: string;

  @ApiProperty({
    example: '09:00',
  })
  startTime!: string;

  @ApiProperty({
    example: '10:00',
  })
  endTime!: string;

  @ApiProperty({
    example: 4,
  })
  capacity!: number;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

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
}
