import type { StaffPortalRole } from '../auth/staff-web-session';
import type { CreateInspectionRequest } from './requests';
import type { InspectionFindingResponse, InspectionResponse } from './responses';

export type InspectionVerificationState =
  | 'verified'
  | 'mixed_verification'
  | 'unverified';

export type StaffInspectionCaptureState =
  | 'capture_ready'
  | 'capture_submitting'
  | 'capture_saved_verified'
  | 'capture_saved_mixed'
  | 'capture_saved_unverified'
  | 'forbidden_role'
  | 'vehicle_not_found'
  | 'booking_vehicle_conflict'
  | 'completion_missing_findings'
  | 'capture_failed';

export type StaffInspectionReadState =
  | 'history_loaded'
  | 'history_empty'
  | 'detail_loaded'
  | 'forbidden_role'
  | 'vehicle_not_found'
  | 'load_failed';

export interface StaffInspectionCaptureStateRule {
  state: StaffInspectionCaptureState;
  surface: 'staff-admin-web';
  truth: 'synchronous-inspection-record' | 'client-guard';
  routeKey: 'createInspection';
  allowedRoles: StaffPortalRole[];
  description: string;
}

export interface StaffInspectionReadStateRule {
  state: StaffInspectionReadState;
  surface: 'staff-admin-web';
  truth: 'synchronous-inspection-record' | 'client-guard';
  routeKey: 'listInspectionsByVehicle';
  allowedRoles: StaffPortalRole[];
  description: string;
}

export interface StaffInspectionCaptureSubmission {
  vehicleId: string;
  request: CreateInspectionRequest;
  expectedSuccessState:
    | Extract<StaffInspectionCaptureState, 'capture_saved_verified'>
    | Extract<StaffInspectionCaptureState, 'capture_saved_mixed'>
    | Extract<StaffInspectionCaptureState, 'capture_saved_unverified'>;
}

export const inspectionStaffRoles: StaffPortalRole[] = [
  'technician',
  'service_adviser',
  'super_admin',
];

export const staffInspectionCaptureStateRules: StaffInspectionCaptureStateRule[] = [
  {
    state: 'capture_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The staff session and target vehicle are ready for inspection capture.',
  },
  {
    state: 'capture_submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The create-inspection request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'capture_saved_verified',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The created inspection contains findings and all findings are verified.',
  },
  {
    state: 'capture_saved_mixed',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The created inspection contains a mix of verified and non-verified findings.',
  },
  {
    state: 'capture_saved_unverified',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The created inspection exists, but verification is incomplete or findings are unverified.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'createInspection',
    allowedRoles: [],
    description: 'The current session role must not access the inspection workspace.',
  },
  {
    state: 'vehicle_not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The selected vehicle does not exist for inspection capture.',
  },
  {
    state: 'booking_vehicle_conflict',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'The booking reference does not belong to the selected vehicle.',
  },
  {
    state: 'completion_missing_findings',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'A completion inspection cannot be saved without at least one finding.',
  },
  {
    state: 'capture_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'createInspection',
    allowedRoles: inspectionStaffRoles,
    description: 'A non-classified network or API failure blocked inspection capture.',
  },
];

export const staffInspectionReadStateRules: StaffInspectionReadStateRule[] = [
  {
    state: 'history_loaded',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: inspectionStaffRoles,
    description: 'At least one inspection record exists for the selected vehicle.',
  },
  {
    state: 'history_empty',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: inspectionStaffRoles,
    description: 'The selected vehicle has no inspection records yet.',
  },
  {
    state: 'detail_loaded',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: inspectionStaffRoles,
    description: 'One inspection record is selected for detail review from the loaded history.',
  },
  {
    state: 'forbidden_role',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: [],
    description: 'The current session role must not access the inspection workspace.',
  },
  {
    state: 'vehicle_not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: inspectionStaffRoles,
    description: 'The selected vehicle does not exist for inspection history loading.',
  },
  {
    state: 'load_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-inspection-record',
    routeKey: 'listInspectionsByVehicle',
    allowedRoles: inspectionStaffRoles,
    description: 'A non-classified network or API failure blocked inspection history loading.',
  },
];

export const getInspectionVerificationState = (
  inspection: InspectionResponse | null | undefined,
): InspectionVerificationState => {
  const findings = inspection?.findings ?? [];

  if (!findings.length) {
    return 'unverified';
  }

  const verifiedCount = findings.filter((finding) => finding.isVerified).length;

  if (verifiedCount === findings.length) {
    return 'verified';
  }

  if (verifiedCount > 0) {
    return 'mixed_verification';
  }

  return 'unverified';
};

export const getStaffInspectionCaptureSuccessState = (
  inspection: InspectionResponse,
): Extract<
  StaffInspectionCaptureState,
  'capture_saved_verified' | 'capture_saved_mixed' | 'capture_saved_unverified'
> => {
  const verificationState = getInspectionVerificationState(inspection);

  if (verificationState === 'verified') {
    return 'capture_saved_verified';
  }

  if (verificationState === 'mixed_verification') {
    return 'capture_saved_mixed';
  }

  return 'capture_saved_unverified';
};

export const getStaffInspectionHistoryState = (
  inspections: InspectionResponse[],
): Extract<StaffInspectionReadState, 'history_loaded' | 'history_empty'> =>
  inspections.length ? 'history_loaded' : 'history_empty';

export const getSelectedInspection = (
  inspections: InspectionResponse[],
  inspectionId?: string | null,
): InspectionResponse | null => {
  if (inspectionId) {
    const selectedInspection = inspections.find((inspection) => inspection.id === inspectionId);
    if (selectedInspection) {
      return selectedInspection;
    }
  }

  return inspections[0] ?? null;
};

export const summarizeInspectionFindings = (
  findings: InspectionFindingResponse[] | undefined,
) => (findings ?? []).map((finding) => `${finding.category}: ${finding.label}`);

export const inspectionCaptureSubmissionTemplate: StaffInspectionCaptureSubmission = {
  vehicleId: 'vehicle-id',
  request: {
    inspectionType: 'completion',
    status: 'completed',
    notes: 'Final inspection before customer release.',
    findings: [
      {
        category: 'brakes',
        label: 'Brake pedal response confirmed',
        severity: 'medium',
        isVerified: true,
      },
    ],
  },
  expectedSuccessState: 'capture_saved_verified',
};
