import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type { InsuranceInquiryResponse, InsuranceRecordResponse } from '../../lib/api/generated/insurance/responses';

export const insuranceInquiryMock: InsuranceInquiryResponse = {
  id: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  inquiryType: 'comprehensive',
  subject: 'Accident repair inquiry',
  description: 'Customer reported front-bumper and headlight damage after a minor collision.',
  status: 'approved_for_record',
  providerName: 'Safe Road Insurance',
  policyNumber: 'POL-2026-0042',
  notes: 'Customer will upload OR/CR later.',
  reviewNotes: 'Internal tracking record approved after adviser review.',
  createdByUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  reviewedByUserId: 'd3bf3f0a-a95c-4b94-a3bd-f9f83120d017',
  reviewedAt: '2026-04-22T10:00:00.000Z',
  createdAt: '2026-04-22T09:30:00.000Z',
  updatedAt: '2026-04-22T09:30:00.000Z',
  documents: [
    {
      id: '4d1b2c47-c5e2-44a8-9180-4096ea4c9d05',
      inquiryId: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
      fileName: 'damage-photo-front.jpg',
      fileUrl: '/mock/insurance/damage-photo-front.jpg',
      documentType: 'photo',
      notes: 'Front bumper damage before estimate review.',
      uploadedByUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
      createdAt: '2026-04-22T09:31:00.000Z',
      updatedAt: '2026-04-22T09:31:00.000Z',
    },
  ],
};

export const insuranceRecordMock: InsuranceRecordResponse = {
  id: '32f69cef-20a1-4137-8f8f-86d2d1791f25',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  inquiryId: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  inquiryType: 'comprehensive',
  providerName: 'Safe Road Insurance',
  policyNumber: 'POL-2026-0042',
  status: 'approved_for_record',
  createdAt: '2026-04-22T10:00:00.000Z',
  updatedAt: '2026-04-22T10:00:00.000Z',
};

export const insuranceVehicleOwnershipErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Vehicle does not belong to the submitted customer.',
  source: 'swagger',
};
