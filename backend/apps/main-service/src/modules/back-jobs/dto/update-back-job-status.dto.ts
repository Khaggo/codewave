import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { backJobStatusEnum } from '../schemas/back-jobs.schema';

type BackJobStatus = (typeof backJobStatusEnum.enumValues)[number];

export class UpdateBackJobStatusDto {
  @ApiProperty({
    enum: backJobStatusEnum.enumValues,
    example: 'approved_for_rework',
  })
  @IsEnum(backJobStatusEnum.enumValues)
  status!: BackJobStatus;

  @ApiPropertyOptional({
    example: 'c6dff175-c86d-4d61-b472-5457d7fa85d4',
    description: 'Optional return inspection reference captured during review transitions.',
  })
  @IsOptional()
  @IsUUID()
  returnInspectionId?: string;

  @ApiPropertyOptional({
    example: 'Inspection findings support a warranty rework classification.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    example: 'Rework completed and verified with the customer.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNotes?: string;
}
