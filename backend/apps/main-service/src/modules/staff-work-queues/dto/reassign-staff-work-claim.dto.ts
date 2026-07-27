import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ReassignStaffWorkClaimDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({ example: 'Shift handoff approved by supervisor.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
