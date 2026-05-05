import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

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
}
