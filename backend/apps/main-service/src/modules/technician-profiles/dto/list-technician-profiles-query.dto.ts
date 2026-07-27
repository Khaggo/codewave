import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTechnicianProfilesQueryDto {
  @ApiPropertyOptional({
    example: 'mechanic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialty?: string;

  @ApiPropertyOptional({
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  activeOnly?: string;
}
