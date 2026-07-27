import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

export class ClaimStaffWorkDto {
  @ApiProperty({ enum: ['booking_handoff', 'job_order'] })
  @IsIn(['booking_handoff', 'job_order'])
  entityType!: 'booking_handoff' | 'job_order';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityId!: string;
}
