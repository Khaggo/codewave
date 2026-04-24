import { insuranceRoutes, type InsuranceInquiryStatus, type InsuranceInquiryType } from './requests';
import type {
  InsuranceInquiryResponse,
  InsuranceRecordResponse,
} from './responses';

export type CustomerInsuranceIntakeState =
  | 'no_vehicle'
  | 'draft_ready'
  | 'submitting'
  | 'submitted_inquiry'
  | 'validation_error'
  | 'invalid_vehicle'
  | 'unauthorized_session'
  | 'submit_failed';

export type CustomerInsuranceTrackingState =
  | 'tracking_loading'
  | 'tracking_empty'
  | 'tracking_latest_inquiry'
  | 'tracking_vehicle_records'
  | 'tracking_not_found'
  | 'tracking_unauthorized_session'
  | 'tracking_load_failed';

export interface CustomerInsuranceIntakeStateRule {
  state: CustomerInsuranceIntakeState;
  surface: 'customer-mobile';
  truth: 'insurance-inquiry-route' | 'vehicle-ownership-gate' | 'client-guard';
  routeKey: 'createInquiry';
  description: string;
}

export interface CustomerInsuranceTrackingStateRule {
  state: CustomerInsuranceTrackingState;
  surface: 'customer-mobile';
  truth: 'insurance-inquiry-route' | 'insurance-record-route' | 'client-guard';
  routeKey: 'getInquiryById' | 'listVehicleInsuranceRecords';
  description: string;
}

export interface CustomerInsuranceInquiryPresentation {
  id: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  subject: string;
  description: string;
  statusValue: InsuranceInquiryStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  notes: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInsuranceRecordPresentation {
  id: string;
  inquiryId: string;
  userId: string;
  vehicleId: string;
  inquiryType: InsuranceInquiryType;
  statusValue: InsuranceInquiryStatus;
  statusHint: string;
  providerName: string | null;
  policyNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export const customerInsuranceDraftTemplate = {
  inquiryType: 'comprehensive' as InsuranceInquiryType,
  subject: '',
  description: '',
  providerName: '',
  policyNumber: '',
  notes: '',
};

export const customerInsuranceStatusHints: Record<InsuranceInquiryStatus, string> = {
  submitted: 'Your inquiry is recorded and waiting for staff review.',
  under_review: 'A service adviser is currently reviewing the insurance request.',
  needs_documents: 'More documents are needed before staff can continue the request.',
  approved_for_record: 'The inquiry is approved for internal record tracking.',
  rejected: 'The inquiry cannot continue in its current state.',
  closed: 'The inquiry is closed and no longer accepting changes.',
};

export const customerInsuranceIntakeStateRules: CustomerInsuranceIntakeStateRule[] = [
  {
    state: 'no_vehicle',
    surface: 'customer-mobile',
    truth: 'vehicle-ownership-gate',
    routeKey: 'createInquiry',
    description: 'Insurance intake cannot start until the customer has at least one owned vehicle.',
  },
  {
    state: 'draft_ready',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The customer can prepare an inquiry draft using a selected owned vehicle and documented fields only.',
  },
  {
    state: 'submitting',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The create inquiry request is currently in flight.',
  },
  {
    state: 'submitted_inquiry',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'The backend accepted the inquiry and returned the canonical inquiry status.',
  },
  {
    state: 'validation_error',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'The submitted inquiry payload is missing required documented fields or contains invalid values.',
  },
  {
    state: 'invalid_vehicle',
    surface: 'customer-mobile',
    truth: 'vehicle-ownership-gate',
    routeKey: 'createInquiry',
    description: 'The selected vehicle is missing, no longer exists, or does not belong to the customer.',
  },
  {
    state: 'unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createInquiry',
    description: 'The customer session is missing before intake can be submitted.',
  },
  {
    state: 'submit_failed',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'createInquiry',
    description: 'A non-classified network or API failure prevented inquiry creation.',
  },
];

export const customerInsuranceTrackingStateRules: CustomerInsuranceTrackingStateRule[] = [
  {
    state: 'tracking_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The mobile app is loading customer-safe claim-status data for the selected owned vehicle.',
  },
  {
    state: 'tracking_empty',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'No claim-status record or known inquiry is available yet for the selected vehicle.',
  },
  {
    state: 'tracking_latest_inquiry',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'getInquiryById',
    description: 'The mobile app is showing the latest known inquiry state using a specific inquiry id.',
  },
  {
    state: 'tracking_vehicle_records',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The selected vehicle already has one or more insurance record updates available for customer visibility.',
  },
  {
    state: 'tracking_not_found',
    surface: 'customer-mobile',
    truth: 'insurance-inquiry-route',
    routeKey: 'getInquiryById',
    description: 'The requested inquiry id no longer exists or is not accessible to the current customer.',
  },
  {
    state: 'tracking_unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'The customer session is missing before claim-status tracking can load.',
  },
  {
    state: 'tracking_load_failed',
    surface: 'customer-mobile',
    truth: 'insurance-record-route',
    routeKey: 'listVehicleInsuranceRecords',
    description: 'A non-classified network or API failure prevented claim-status data from loading.',
  },
];

export const buildCustomerInsuranceInquiryPresentation = (
  inquiry: InsuranceInquiryResponse,
): CustomerInsuranceInquiryPresentation => ({
  id: inquiry.id,
  userId: inquiry.userId,
  vehicleId: inquiry.vehicleId,
  inquiryType: inquiry.inquiryType,
  subject: inquiry.subject,
  description: inquiry.description,
  statusValue: inquiry.status,
  statusHint: customerInsuranceStatusHints[inquiry.status],
  providerName: inquiry.providerName ?? null,
  policyNumber: inquiry.policyNumber ?? null,
  notes: inquiry.notes ?? null,
  documentCount: Array.isArray(inquiry.documents) ? inquiry.documents.length : 0,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt,
});

export const buildCustomerInsuranceRecordPresentation = (
  record: InsuranceRecordResponse,
): CustomerInsuranceRecordPresentation => ({
  id: record.id,
  inquiryId: record.inquiryId,
  userId: record.userId,
  vehicleId: record.vehicleId,
  inquiryType: record.inquiryType,
  statusValue: record.status,
  statusHint: customerInsuranceStatusHints[record.status],
  providerName: record.providerName ?? null,
  policyNumber: record.policyNumber ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const getCustomerInsuranceTrackingState = ({
  latestInquiry,
  records,
}: {
  latestInquiry: CustomerInsuranceInquiryPresentation | null;
  records: CustomerInsuranceRecordPresentation[];
}): Extract<
  CustomerInsuranceTrackingState,
  'tracking_empty' | 'tracking_latest_inquiry' | 'tracking_vehicle_records'
> => {
  if (records.length) {
    return 'tracking_vehicle_records';
  }

  if (latestInquiry) {
    return 'tracking_latest_inquiry';
  }

  return 'tracking_empty';
};

export const customerInsuranceContractSources = {
  createInquiry: insuranceRoutes.createInquiry,
  getInquiryById: insuranceRoutes.getInquiryById,
  listVehicleInsuranceRecords: insuranceRoutes.listVehicleInsuranceRecords,
} as const;
