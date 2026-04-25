import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type { InsuranceInquiryResponse, InsuranceRecordResponse } from '../../lib/api/generated/insurance/responses';
import {
  buildCustomerInsuranceDocumentPresentation,
  buildCustomerInsuranceInquiryPresentation,
  buildCustomerInsuranceRecordPresentation,
  type CustomerInsuranceIntakeState,
  type CustomerInsuranceDocumentUploadState,
  type CustomerInsuranceTrackingState,
  customerInsuranceDocumentDraftTemplate,
  customerInsuranceDocumentUploadStateRules,
} from '../../lib/api/generated/insurance/customer-mobile-insurance';
import {
  buildStaffInsuranceQueueItem,
  getAllowedInsuranceStatusTargets,
  getSelectedInsuranceQueueItem,
  getStaffInsuranceQueueState,
  insuranceStatusUpdateDraftTemplate,
  staffInsuranceQueueStateRules,
  staffInsuranceStatusUpdateStateRules,
} from '../../lib/api/generated/insurance/staff-web-insurance';

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

export const customerInsuranceNoVehicleStateMock: {
  intakeState: CustomerInsuranceIntakeState;
  trackingState: CustomerInsuranceTrackingState;
  message: string;
} = {
  intakeState: 'no_vehicle',
  trackingState: 'tracking_empty',
  message: 'Add or select an owned vehicle before starting an insurance inquiry.',
};

export const customerInsuranceDraftIntakeStateMock: {
  intakeState: CustomerInsuranceIntakeState;
  trackingState: CustomerInsuranceTrackingState;
  selectedVehicleId: string;
  draft: {
    inquiryType: 'comprehensive' | 'ctpl';
    subject: string;
    description: string;
    providerName: string;
    policyNumber: string;
    notes: string;
  };
} = {
  intakeState: 'draft_ready',
  trackingState: 'tracking_empty',
  selectedVehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  draft: {
    inquiryType: 'comprehensive',
    subject: 'Front bumper accident claim',
    description: 'Customer needs claim tracking for bumper, grille, and right headlight damage.',
    providerName: 'Safe Road Insurance',
    policyNumber: 'POL-2026-0042',
    notes: 'OR/CR upload will follow after the first staff callback.',
  },
};

export const customerInsuranceDocumentUploadDraftMock: {
  state: CustomerInsuranceDocumentUploadState;
  inquiryId: string;
  request: typeof customerInsuranceDocumentDraftTemplate;
} = {
  state: 'document_ready',
  inquiryId: insuranceInquiryMock.id,
  request: {
    ...customerInsuranceDocumentDraftTemplate,
    documentType: 'or_cr',
    fileName: 'or-cr-scan.pdf',
    fileUrl: 'https://files.autocare.local/insurance/or-cr-scan.pdf',
    notes: 'OR/CR scan requested while the inquiry is in needs_documents.',
  },
};

export const customerInsuranceUploadedDocumentMock = buildCustomerInsuranceDocumentPresentation(
  insuranceInquiryMock.documents[0],
);

export const customerInsuranceSubmittedInquiryMock = buildCustomerInsuranceInquiryPresentation({
  ...insuranceInquiryMock,
  status: 'submitted',
  reviewNotes: null,
  reviewedByUserId: null,
  reviewedAt: null,
  documents: [],
});

export const customerInsuranceDocumentUploadedInquiryMock = buildCustomerInsuranceInquiryPresentation({
  ...insuranceInquiryMock,
  status: 'needs_documents',
});

export const customerInsuranceClaimStatusUpdatesMock = [
  buildCustomerInsuranceRecordPresentation(insuranceRecordMock),
  buildCustomerInsuranceRecordPresentation({
    ...insuranceRecordMock,
    id: 'c43a2d39-9b0e-47d0-8c09-67384aa4d72b',
    status: 'closed',
    updatedAt: '2026-04-24T14:15:00.000Z',
  }),
];

export const staffInsuranceReviewQueueMock = [
  buildStaffInsuranceQueueItem({
    ...insuranceInquiryMock,
    status: 'submitted',
    reviewNotes: null,
    reviewedByUserId: null,
    reviewedAt: null,
    documents: [],
    createdAt: '2026-04-25T08:15:00.000Z',
    updatedAt: '2026-04-25T08:15:00.000Z',
  }),
  buildStaffInsuranceQueueItem({
    ...insuranceInquiryMock,
    id: '9c770266-b2d8-4b80-8251-a8f62f7e2db7',
    subject: 'Windshield replacement request',
    inquiryType: 'ctpl',
    status: 'under_review',
    providerName: 'Bayan Shield',
    policyNumber: 'CTPL-2026-1180',
    notes: 'Estimate is attached. Waiting for adviser confirmation.',
    reviewNotes: 'Claim photos are complete. Cross-checking policy details before approval.',
    createdAt: '2026-04-24T11:00:00.000Z',
    updatedAt: '2026-04-25T09:40:00.000Z',
  }),
  buildStaffInsuranceQueueItem({
    ...insuranceInquiryMock,
    id: 'c4f8e0d4-51fb-4dbd-b317-2f0d0ec9b9a7',
    subject: 'Flood-damage intake',
    inquiryType: 'comprehensive',
    status: 'needs_documents',
    providerName: 'Safe Road Insurance',
    policyNumber: 'POL-2026-1199',
    notes: 'Customer still needs to provide the OR/CR scan.',
    reviewNotes: 'Ask the customer for the OR/CR and a clearer dashboard photo before proceeding.',
    createdAt: '2026-04-23T15:20:00.000Z',
    updatedAt: '2026-04-25T07:55:00.000Z',
    documents: [],
  }),
];

export const emptyStaffInsuranceReviewQueueMock = [];

export const staffInsuranceSelectedInquiryMock = getSelectedInsuranceQueueItem(
  staffInsuranceReviewQueueMock,
  '9c770266-b2d8-4b80-8251-a8f62f7e2db7',
);

export const staffInsuranceStatusUpdateDraftMock = {
  ...insuranceStatusUpdateDraftTemplate,
  inquiryId: staffInsuranceSelectedInquiryMock?.id ?? insuranceStatusUpdateDraftTemplate.inquiryId,
  request: {
    status: 'approved_for_record' as const,
    reviewNotes: 'Documents are complete and the inquiry can move into tracked record mode.',
  },
};

export const staffInsuranceAllowedTransitionMocks = {
  submitted: getAllowedInsuranceStatusTargets('submitted'),
  underReview: getAllowedInsuranceStatusTargets('under_review'),
  needsDocuments: getAllowedInsuranceStatusTargets('needs_documents'),
} as const;

export const staffInsuranceResolvedStateMocks = {
  loaded: getStaffInsuranceQueueState(staffInsuranceReviewQueueMock),
  empty: getStaffInsuranceQueueState(emptyStaffInsuranceReviewQueueMock),
  selected: getSelectedInsuranceQueueItem(
    staffInsuranceReviewQueueMock,
    staffInsuranceReviewQueueMock[0]?.id,
  ),
} as const;

export const staffInsuranceQueueStateRuleMocks = staffInsuranceQueueStateRules;

export const staffInsuranceStatusUpdateStateRuleMocks = staffInsuranceStatusUpdateStateRules;

export const customerInsuranceDocumentUploadStateRuleMocks =
  customerInsuranceDocumentUploadStateRules;

export const staffInsuranceForbiddenRoleErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Your role does not have access to the insurance review workspace in the staff portal.',
  source: 'task',
};

export const staffInsuranceInquiryNotFoundErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Insurance inquiry not found.',
  source: 'swagger',
};

export const staffInsuranceInvalidTransitionErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Cannot transition insurance inquiry from submitted to closed',
  source: 'swagger',
};
