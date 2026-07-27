import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const staffWorkQueueViewValues = ['my', 'team', 'unassigned', 'blocked', 'history'] as const;
export type StaffWorkQueueView = (typeof staffWorkQueueViewValues)[number];

export class ListStaffWorkQueueQueryDto {
  @ApiPropertyOptional({ enum: staffWorkQueueViewValues, default: 'team' })
  @IsOptional()
  @IsIn(staffWorkQueueViewValues)
  view?: StaffWorkQueueView;

  @ApiPropertyOptional({ description: 'Server-side reference, customer, vehicle, or status search.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous page.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
