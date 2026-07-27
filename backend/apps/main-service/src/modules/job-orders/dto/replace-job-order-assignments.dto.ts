import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';

import { JobOrderTechnicianAssignmentDto } from './job-order-technician-assignment.dto';

export class ReplaceJobOrderAssignmentsDto {
  @ApiProperty({
    type: () => JobOrderTechnicianAssignmentDto,
    isArray: true,
    example: [{ technicianProfileId: '61539ebf-e98a-45da-aa0d-a19acded1d7f', selectedSpecialty: 'mechanic' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobOrderTechnicianAssignmentDto)
  assignments?: JobOrderTechnicianAssignmentDto[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description: 'Legacy compatibility field. Prefer assignments with technicianProfileId plus specialty.',
    example: ['61539ebf-e98a-45da-aa0d-a19acded1d7f'],
  })
  @IsOptional()
  @IsArray()
  assignedTechnicianIds?: string[];

  @ApiPropertyOptional({
    example: '2026-05-18T08:30:00.000Z',
    description: 'Optimistic concurrency token from the latest loaded job-order detail.',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
