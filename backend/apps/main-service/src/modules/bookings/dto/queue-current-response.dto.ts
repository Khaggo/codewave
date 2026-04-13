import { ApiProperty } from '@nestjs/swagger';

import { QueueCurrentItemResponseDto } from './queue-current-item-response.dto';

export class QueueCurrentResponseDto {
  @ApiProperty({
    example: '2026-04-20T08:45:00.000Z',
    format: 'date-time',
  })
  generatedAt!: string;

  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    example: 3,
  })
  currentCount!: number;

  @ApiProperty({
    type: () => QueueCurrentItemResponseDto,
    isArray: true,
  })
  items!: QueueCurrentItemResponseDto[];
}
