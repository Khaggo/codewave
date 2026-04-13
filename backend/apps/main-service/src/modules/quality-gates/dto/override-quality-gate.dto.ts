import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class OverrideQualityGateDto {
  @ApiProperty({
    example: 'Supervisor approved release after reviewing unresolved QA findings and confirming customer acknowledgment.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  reason!: string;
}
