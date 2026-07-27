import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReleaseStaffWorkClaimDto {
  @ApiPropertyOptional({ example: 'Waiting for customer approval.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
