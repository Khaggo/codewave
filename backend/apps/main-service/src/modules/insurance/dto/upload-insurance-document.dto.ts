import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { insuranceDocumentTypeEnum } from '../schemas/insurance.schema';

export class UploadInsuranceDocumentDto {
  @ApiProperty({
    enum: insuranceDocumentTypeEnum.enumValues,
    example: 'proof_of_payment',
  })
  @IsEnum(insuranceDocumentTypeEnum.enumValues)
  documentType!: (typeof insuranceDocumentTypeEnum.enumValues)[number];

  @ApiPropertyOptional({
    example: 'Proof of payment from the customer mobile wallet transaction.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
