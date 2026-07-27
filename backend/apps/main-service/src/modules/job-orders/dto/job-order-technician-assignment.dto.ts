import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class JobOrderTechnicianAssignmentDto {
  @ApiProperty({
    example: '61539ebf-e98a-45da-aa0d-a19acded1d7f',
  })
  @IsUUID()
  technicianProfileId!: string;

  @ApiProperty({
    example: 'mechanic',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  selectedSpecialty!: string;
}
