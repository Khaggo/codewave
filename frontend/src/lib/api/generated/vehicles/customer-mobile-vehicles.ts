import type { CreateVehicleRequest, UpdateVehicleRequest } from './requests';
import type { VehicleResponse } from './responses';

export type CustomerVehicleOnboardingState =
  | 'first_vehicle_required'
  | 'first_vehicle_ready'
  | 'first_vehicle_saving'
  | 'vehicle_validation_error'
  | 'duplicate_plate_conflict'
  | 'vehicle_forbidden';

export type CustomerVehicleManagementState =
  | 'owned_vehicle_list_empty'
  | 'owned_vehicle_list_ready'
  | 'primary_vehicle_ready'
  | 'vehicle_update_saving'
  | 'vehicle_not_found'
  | 'vehicle_load_failed';

export interface CustomerVehicleOnboardingStateRule {
  state: CustomerVehicleOnboardingState;
  surface: 'customer-mobile';
  truth: 'synchronous-vehicle-record' | 'client-guard';
  routeKey: 'createVehicle' | 'listVehiclesByUser';
  description: string;
}

export interface CustomerVehicleManagementStateRule {
  state: CustomerVehicleManagementState;
  surface: 'customer-mobile';
  truth: 'synchronous-vehicle-record' | 'client-guard';
  routeKey: 'getVehicleById' | 'updateVehicle' | 'listVehiclesByUser';
  description: string;
}

export interface CustomerFirstVehicleSubmission {
  request: CreateVehicleRequest;
  onboardingStage: 'post_activation_first_vehicle';
  expectedSuccessState: Extract<CustomerVehicleOnboardingState, 'first_vehicle_ready'>;
}

export interface CustomerVehicleUpdateSubmission {
  request: UpdateVehicleRequest;
  optimisticPolicy: 'replace-local-primary-vehicle-only-after-server-success';
  expectedSuccessState: Extract<CustomerVehicleManagementState, 'primary_vehicle_ready'>;
}

export const customerVehicleOnboardingStateRules: CustomerVehicleOnboardingStateRule[] = [
  {
    state: 'first_vehicle_required',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'The customer has no canonical owned vehicle yet, so onboarding is incomplete.',
  },
  {
    state: 'first_vehicle_ready',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'At least one owned vehicle exists, so downstream customer flows may proceed.',
  },
  {
    state: 'first_vehicle_saving',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createVehicle',
    description: 'The first-vehicle create request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'vehicle_validation_error',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'createVehicle',
    description: 'The submitted vehicle payload is invalid.',
  },
  {
    state: 'duplicate_plate_conflict',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'createVehicle',
    description: 'The requested plate number is already attached to another vehicle record.',
  },
  {
    state: 'vehicle_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createVehicle',
    description: 'The mobile session is missing or blocked before vehicle mutation can continue.',
  },
];

export const customerVehicleManagementStateRules: CustomerVehicleManagementStateRule[] = [
  {
    state: 'owned_vehicle_list_empty',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'The customer does not currently own any vehicles.',
  },
  {
    state: 'owned_vehicle_list_ready',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'The customer owned-vehicle list is available for booking, insurance, and profile flows.',
  },
  {
    state: 'primary_vehicle_ready',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'The client can derive one primary vehicle from the canonical owned-vehicle list.',
  },
  {
    state: 'vehicle_update_saving',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateVehicle',
    description: 'A live vehicle update request is in flight.',
  },
  {
    state: 'vehicle_not_found',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'getVehicleById',
    description: 'The requested vehicle record no longer exists.',
  },
  {
    state: 'vehicle_load_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-vehicle-record',
    routeKey: 'listVehiclesByUser',
    description: 'A non-classified network or API failure prevented vehicle data from loading.',
  },
];

export const getPrimaryCustomerVehicle = (
  vehicles: VehicleResponse[],
  preferredVehicleId?: string | null,
): VehicleResponse | null => {
  if (preferredVehicleId) {
    const matchingVehicle = vehicles.find((vehicle) => vehicle.id === preferredVehicleId);
    if (matchingVehicle) {
      return matchingVehicle;
    }
  }

  return vehicles[0] ?? null;
};

export const buildCustomerVehicleLabel = (vehicle: VehicleResponse | null | undefined) =>
  [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ') || String(vehicle?.plateNumber ?? '').trim() || 'Owned vehicle';

export const getCustomerVehicleOnboardingState = (
  vehicles: VehicleResponse[],
): Extract<CustomerVehicleOnboardingState, 'first_vehicle_required' | 'first_vehicle_ready'> =>
  vehicles.length ? 'first_vehicle_ready' : 'first_vehicle_required';

export const getCustomerVehicleManagementState = (
  vehicles: VehicleResponse[],
): Extract<CustomerVehicleManagementState, 'owned_vehicle_list_empty' | 'owned_vehicle_list_ready'> =>
  vehicles.length ? 'owned_vehicle_list_ready' : 'owned_vehicle_list_empty';

export const getCustomerPrimaryVehicleState = (
  vehicles: VehicleResponse[],
  preferredVehicleId?: string | null,
): Extract<CustomerVehicleManagementState, 'primary_vehicle_ready' | 'owned_vehicle_list_empty'> =>
  getPrimaryCustomerVehicle(vehicles, preferredVehicleId) ? 'primary_vehicle_ready' : 'owned_vehicle_list_empty';

export const customerFirstVehicleSubmissionTemplate: CustomerFirstVehicleSubmission = {
  request: {
    userId: 'customer-user-id',
    plateNumber: 'ABC-1234',
    make: 'Toyota',
    model: 'Vios',
    year: 2024,
    color: 'Silver',
  },
  onboardingStage: 'post_activation_first_vehicle',
  expectedSuccessState: 'first_vehicle_ready',
};

export const customerVehicleUpdateSubmissionTemplate: CustomerVehicleUpdateSubmission = {
  request: {
    color: 'Gray',
    notes: 'Customer asked to keep this vehicle as the preferred booking option.',
  },
  optimisticPolicy: 'replace-local-primary-vehicle-only-after-server-success',
  expectedSuccessState: 'primary_vehicle_ready',
};
