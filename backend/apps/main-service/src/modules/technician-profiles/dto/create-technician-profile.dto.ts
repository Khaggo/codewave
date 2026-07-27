import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTechnicianProfileDto {
  @ApiProperty({
    example: 'Jamie Santos',
  })
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['mechanic', 'electrician'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  specialties!: string[];

  @ApiPropertyOptional({
    example: '09171234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    example: 'Prefers electrical diagnostics and front suspension work.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
