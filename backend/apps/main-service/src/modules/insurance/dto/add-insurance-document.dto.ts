import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { insuranceDocumentTypeEnum } from '../schemas/insurance.schema';

export class AddInsuranceDocumentDto {
  @ApiProperty({
    example: 'damage-photo-front.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    example: 'https://files.autocare.local/insurance/damage-photo-front.jpg',
  })
  @IsString()
  fileUrl!: string;

  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    example: 'photo',
  })
  @IsEnum(insuranceDocumentTypeEnum.enumValues)
  documentType!: (typeof insuranceDocumentTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Front bumper damage before estimate review.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
