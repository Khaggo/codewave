import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InsuranceDocumentResponseDto } from './insurance-document-response.dto';

class InsuranceActivityResponseDto {
  @ApiProperty({
    example: 'd9e1ab3d-a8c8-43da-b0ba-81a709f9385c',
  })
  id!: string;

  @ApiProperty({
    example: 'document_uploaded',
  })
  action!: string;

  @ApiPropertyOptional({
    example: 'proof_of_payment',
  })
  documentType?: string | null;

  @ApiPropertyOptional({
    example: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  })
  actorUserId?: string | null;

  @ApiPropertyOptional({
    example: 'Proof of payment from the customer mobile wallet transaction.',
  })
  notes?: string | null;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-14T08:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}

export class UploadInsuranceDocumentResponseDto {
  @ApiProperty({
    type: () => InsuranceDocumentResponseDto,
    isArray: true,
  })
  documents!: InsuranceDocumentResponseDto[];

  @ApiProperty({
    type: () => InsuranceActivityResponseDto,
    isArray: true,
  })
  activities!: InsuranceActivityResponseDto[];
}
