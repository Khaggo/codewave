import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadInspectionPhotoDto {
  @ApiPropertyOptional({
    example: 'front',
    description: 'Optional inspection photo slot label. Defaults to general when omitted.',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  slot?: string;
}
