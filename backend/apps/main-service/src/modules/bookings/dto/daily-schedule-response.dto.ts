import { ApiProperty } from '@nestjs/swagger';

import { DailyScheduleSlotViewDto } from './daily-schedule-slot-view.dto';

export class DailyScheduleResponseDto {
  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    type: () => DailyScheduleSlotViewDto,
    isArray: true,
  })
  slots!: DailyScheduleSlotViewDto[];
}
