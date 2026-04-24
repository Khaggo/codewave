import type { CreateVehicleRequest, UpdateVehicleRequest } from '../../lib/api/generated/vehicles/requests';
import type { VehicleResponse } from '../../lib/api/generated/vehicles/responses';
import {
  buildCustomerVehicleLabel,
  customerFirstVehicleSubmissionTemplate,
  customerVehicleManagementStateRules,
  customerVehicleOnboardingStateRules,
  customerVehicleUpdateSubmissionTemplate,
  getCustomerPrimaryVehicleState,
  getCustomerVehicleManagementState,
  getCustomerVehicleOnboardingState,
  getPrimaryCustomerVehicle,
} from '../../lib/api/generated/vehicles/customer-mobile-vehicles';
import { vehiclesErrorCases } from '../../lib/api/generated/vehicles/errors';
import type { ApiErrorResponse } from '../../lib/api/generated/shared';

export const primaryOwnedVehicleMock: VehicleResponse = {
  id: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  plateNumber: 'ABC-1234',
  make: 'Toyota',
  model: 'Vios',
  year: 2024,
  color: 'Silver',
  vin: null,
  notes: null,
  createdAt: '2026-03-25T15:00:00.000Z',
  updatedAt: '2026-03-25T15:00:00.000Z',
};

export const secondaryOwnedVehicleMock: VehicleResponse = {
  id: '1275404b-7ab7-4697-a7cc-19326d8fd225',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  plateNumber: 'XYZ-5678',
  make: 'Honda',
  model: 'City',
  year: 2022,
  color: 'White',
  vin: 'MHGFA1650KE123456',
  notes: 'Secondary family vehicle.',
  createdAt: '2026-04-02T08:15:00.000Z',
  updatedAt: '2026-04-02T08:15:00.000Z',
};

export const customerOwnedVehiclesMock: VehicleResponse[] = [
  primaryOwnedVehicleMock,
  secondaryOwnedVehicleMock,
];

export const customerNoOwnedVehiclesMock: VehicleResponse[] = [];

export const createVehicleRequestMock: CreateVehicleRequest =
  customerFirstVehicleSubmissionTemplate.request;

export const updateVehicleRequestMock: UpdateVehicleRequest =
  customerVehicleUpdateSubmissionTemplate.request;

export const customerVehicleOnboardingStateRuleMocks = customerVehicleOnboardingStateRules;

export const customerVehicleManagementStateRuleMocks = customerVehicleManagementStateRules;

export const customerVehicleResolvedStateMocks = {
  onboardingRequired: getCustomerVehicleOnboardingState(customerNoOwnedVehiclesMock),
  onboardingReady: getCustomerVehicleOnboardingState(customerOwnedVehiclesMock),
  managementEmpty: getCustomerVehicleManagementState(customerNoOwnedVehiclesMock),
  managementReady: getCustomerVehicleManagementState(customerOwnedVehiclesMock),
  primaryVehicleReady: getCustomerPrimaryVehicleState(customerOwnedVehiclesMock),
} as const;

export const customerPrimaryVehicleMocks = {
  active: getPrimaryCustomerVehicle(customerOwnedVehiclesMock),
  none: getPrimaryCustomerVehicle(customerNoOwnedVehiclesMock),
} as const;

export const customerVehicleLabelMocks = {
  primary: buildCustomerVehicleLabel(primaryOwnedVehicleMock),
  secondary: buildCustomerVehicleLabel(secondaryOwnedVehicleMock),
  empty: buildCustomerVehicleLabel(null),
} as const;

export const duplicatePlateVehicleErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Vehicle plate number already exists.',
  source: 'swagger',
};

export const vehicleValidationErrorMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'The submitted vehicle payload is invalid.',
  source: 'swagger',
};

export const vehicleNotFoundErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Vehicle not found.',
  source: 'swagger',
};

export const vehicleForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only the authenticated owner may manage this vehicle flow.',
  source: 'task',
};

export const vehiclesErrorCaseMocks = vehiclesErrorCases;
