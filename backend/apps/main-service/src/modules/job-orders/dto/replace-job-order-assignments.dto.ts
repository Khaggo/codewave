import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ReplaceJobOrderAssignmentsDto {
  @ApiProperty({
    type: String,
    isArray: true,
    example: ['61539ebf-e98a-45da-aa0d-a19acded1d7f'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  assignedTechnicianIds!: string[];

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
