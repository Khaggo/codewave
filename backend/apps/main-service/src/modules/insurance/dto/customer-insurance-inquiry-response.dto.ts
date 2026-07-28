import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';

import { InsuranceDocumentResponseDto } from './insurance-document-response.dto';
import {
  InsuranceActivityResponseDto,
  InsuranceInquiryResponseDto,
} from './insurance-inquiry-response.dto';

export class CustomerInsuranceDocumentResponseDto extends OmitType(InsuranceDocumentResponseDto, [
  'inquiryId',
  'uploadedByUserId',
] as const) {}

export class CustomerInsuranceActivityResponseDto extends PickType(InsuranceActivityResponseDto, [
  'action',
  'documentType',
  'customerMessage',
  'createdAt',
] as const) {}

export class CustomerInsuranceInquiryResponseDto extends OmitType(InsuranceInquiryResponseDto, [
  'userId',
  'reviewNotes',
  'assignedStaffId',
  'customerDisplayName',
  'vehicleLabel',
  'createdByUserId',
  'reviewedByUserId',
  'reviewedAt',
  'documents',
  'activities',
] as const) {
  @ApiProperty({
    type: () => CustomerInsuranceDocumentResponseDto,
    isArray: true,
  })
  documents!: CustomerInsuranceDocumentResponseDto[];

  @ApiProperty({
    type: () => CustomerInsuranceActivityResponseDto,
    isArray: true,
  })
  activities!: CustomerInsuranceActivityResponseDto[];
}

export class CustomerInsuranceInquiryPageResponseDto {
  @ApiProperty({
    type: () => CustomerInsuranceInquiryResponseDto,
    isArray: true,
  })
  items!: CustomerInsuranceInquiryResponseDto[];

  @ApiProperty({
    example: {
      limit: 20,
      hasNext: true,
      nextCursor: 'eyJ2IjoxLCJjcmVhdGVkQXQiOiIyMDI2LTA3LTI4VDA4OjMwOjAwLjAwMFoiLCJpZCI6Ii4uLiJ9',
    },
  })
  page!: {
    limit: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
}
