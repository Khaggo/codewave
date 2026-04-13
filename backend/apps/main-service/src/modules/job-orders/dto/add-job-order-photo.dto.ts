import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class AddJobOrderPhotoDto {
  @ApiProperty({
    example: 'front-brake-before.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    example: 'https://files.example.com/job-orders/front-brake-before.jpg',
  })
  @IsString()
  @IsUrl({
    require_protocol: true,
  })
  fileUrl!: string;

  @ApiPropertyOptional({
    example: 'Visible brake-pad wear before replacement.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
