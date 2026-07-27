import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStaffQueueSessionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  available!: boolean;
}
