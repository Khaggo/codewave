import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DailyScheduleSlotViewDto } from './daily-schedule-slot-view.dto';

export class DailyScheduleResponseDto {
  @ApiProperty({
    example: '2026-04-20',
  })
  scheduledDate!: string;

  @ApiProperty({
    example: false,
  })
  isClosed!: boolean;

  @ApiPropertyOptional({
    example: 'Holiday closure',
    nullable: true,
  })
  closureLabel?: string | null;

  @ApiPropertyOptional({
    example: 'Shop is closed for the Christmas holiday.',
    nullable: true,
  })
  closureReason?: string | null;

  @ApiProperty({
    type: () => DailyScheduleSlotViewDto,
    isArray: true,
  })
  slots!: DailyScheduleSlotViewDto[];
}
