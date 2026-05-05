import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordQualityGateVerdictDto {
  @ApiPropertyOptional({
    enum: ['passed', 'blocked'],
    example: 'passed',
  })
  @IsIn(['passed', 'blocked'])
  verdict!: 'passed' | 'blocked';

  @ApiPropertyOptional({
    example: 'Physical inspection matched the completed work and customer concern.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
