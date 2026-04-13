import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStaffAccountStatusDto {
  @ApiProperty({
    example: false,
    description: 'Set to false to deactivate a staff account and revoke future authentication.',
  })
  @IsBoolean()
  isActive!: boolean;
}
