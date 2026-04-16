import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffAccountStatusDto {
  @ApiProperty({
    example: false,
    description: 'Set to false to deactivate a staff account and revoke future authentication.',
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({
    example: 'Temporarily deactivated pending HR review.',
    description: 'Optional audit reason for the activation-status change.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
