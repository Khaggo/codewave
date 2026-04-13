import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CreateBackJobFindingDto } from './create-back-job-finding.dto';

export class CreateBackJobDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  @IsUUID()
  customerUserId!: string;

  @ApiProperty({
    example: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
    description: 'Finalized original job order that this return case is being reviewed against.',
  })
  @IsUUID()
  originalJobOrderId!: string;

  @ApiPropertyOptional({
    example: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  })
  @IsOptional()
  @IsUUID()
  originalBookingId?: string;

  @ApiPropertyOptional({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
    description: 'Return inspection used to validate the back-job complaint.',
  })
  @IsOptional()
  @IsUUID()
  returnInspectionId?: string;

  @ApiProperty({
    example: 'Customer reports the same leak two days after the previous repair.',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  complaint!: string;

  @ApiPropertyOptional({
    example: 'Initial review opened by the service adviser pending return inspection.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    type: () => CreateBackJobFindingDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBackJobFindingDto)
  findings?: CreateBackJobFindingDto[];
}
