import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateAddressRequest,
  UpsertAddressRequest,
} from '../../lib/api/generated/users/requests';
import type { AddressResponse, UserResponse } from '../../lib/api/generated/users/responses';
import {
  customerAddressMutationTemplates,
  customerAddressStateRules,
  customerProfileStateRules,
  customerProfileUpdateSubmissionTemplate,
  getCustomerAddressState,
  getCustomerDefaultAddress,
  getCustomerProfileState,
} from '../../lib/api/generated/users/customer-mobile-profile';
import type { ApiErrorResponse } from '../../lib/api/generated/shared';

export const userAddressMock: AddressResponse = {
  id: '71b4200e-7747-4b0d-bd5d-c2c3ecdc0669',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  label: 'Home',
  addressLine1: '123 AutoCare Street',
  addressLine2: 'Barangay Road',
  city: 'Quezon City',
  province: 'Metro Manila',
  postalCode: '1100',
  isDefault: true,
  createdAt: '2026-03-25T15:00:00.000Z',
  updatedAt: '2026-03-25T15:00:00.000Z',
};

export const customerUserResponseMock: UserResponse = {
  id: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  email: 'customer@example.com',
  role: 'customer',
  staffCode: null,
  isActive: true,
  createdAt: '2026-03-25T15:00:00.000Z',
  updatedAt: '2026-03-25T15:00:00.000Z',
  profile: {
    id: '95a90f87-1974-4bdb-bfc1-12dba24d80f5',
    userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+639171234567',
    birthday: '1998-04-12',
    createdAt: '2026-03-25T15:00:00.000Z',
    updatedAt: '2026-03-25T15:00:00.000Z',
  },
  addresses: [userAddressMock],
};

export const staffUserResponseMock: UserResponse = {
  id: '5a74bb08-9b6a-4c08-8b97-3b6a3a1b2d88',
  email: 'staff@example.com',
  role: 'service_adviser',
  staffCode: 'SA-0012',
  isActive: true,
  createdAt: '2026-03-25T15:00:00.000Z',
  updatedAt: '2026-03-25T15:00:00.000Z',
  profile: {
    id: '4ae9f7d9-5b25-4b58-8f84-491d9f7b5427',
    userId: '5a74bb08-9b6a-4c08-8b97-3b6a3a1b2d88',
    firstName: 'Sam',
    lastName: 'Adviser',
    phone: '+639171112222',
    birthday: null,
    createdAt: '2026-03-25T15:00:00.000Z',
    updatedAt: '2026-03-25T15:00:00.000Z',
  },
  addresses: [],
};

export const deactivatedStaffUserResponseMock: UserResponse = {
  ...staffUserResponseMock,
  id: 'b7137c9a-cb5d-4d37-b313-cbf779ce9d3a',
  email: 'deactivated.staff@example.com',
  staffCode: 'SA-0098',
  isActive: false,
  updatedAt: '2026-04-12T08:30:00.000Z',
};

export const customerIncompleteProfileUserResponseMock: UserResponse = {
  ...customerUserResponseMock,
  id: '0d403ea1-9ca6-4a28-b3f0-2efb7715f8b6',
  email: 'incomplete.customer@example.com',
  profile: {
    ...customerUserResponseMock.profile!,
    id: '99da91df-8d47-4d7d-8a7b-1cbf426d0b38',
    phone: null,
    birthday: null,
  },
  addresses: [userAddressMock],
};

export const customerNoAddressesUserResponseMock: UserResponse = {
  ...customerUserResponseMock,
  id: '0a2a327b-5265-41f1-924d-34718126b534',
  email: 'no.addresses@example.com',
  addresses: [],
};

export const deactivatedCustomerUserResponseMock: UserResponse = {
  ...customerUserResponseMock,
  id: '54009cc7-0dc3-42fd-a2d1-18a7c82ed72d',
  email: 'deactivated.customer@example.com',
  isActive: false,
  updatedAt: '2026-04-19T04:15:00.000Z',
};

export const createUserRequestMock: CreateUserRequest = {
  email: 'customer@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '+639171234567',
};

export const updateUserRequestMock: UpdateUserRequest = {
  firstName: 'Jane',
  lastName: 'Dela Cruz',
  phone: '+639171234567',
  birthday: '1998-04-12',
};

export const upsertAddressRequestMock: UpsertAddressRequest = {
  label: 'Home',
  addressLine1: '123 AutoCare Street',
  addressLine2: 'Barangay Road',
  city: 'Quezon City',
  province: 'Metro Manila',
  postalCode: '1100',
  isDefault: true,
};

export const updateAddressRequestMock: UpdateAddressRequest = {
  city: 'Makati City',
  isDefault: false,
};

export const secondUserAddressMock: AddressResponse = {
  ...userAddressMock,
  id: '6f73297a-1b1e-43cb-9d23-3ce77470b255',
  label: 'Work',
  addressLine1: '88 Service Avenue',
  addressLine2: 'Unit 5',
  city: 'Makati City',
  province: 'Metro Manila',
  postalCode: '1200',
  isDefault: false,
};

export const customerProfileStateRuleMocks = customerProfileStateRules;

export const customerAddressStateRuleMocks = customerAddressStateRules;

export const customerProfileResolvedStateMocks = {
  ready: getCustomerProfileState(customerUserResponseMock),
  incomplete: getCustomerProfileState(customerIncompleteProfileUserResponseMock),
  deactivated: getCustomerProfileState(deactivatedCustomerUserResponseMock),
} as const;

export const customerAddressResolvedStateMocks = {
  defaultReady: getCustomerAddressState(customerUserResponseMock.addresses ?? []),
  noAddresses: getCustomerAddressState(customerNoAddressesUserResponseMock.addresses ?? []),
  loadedWithoutDefault: getCustomerAddressState([
    { ...userAddressMock, isDefault: false },
    secondUserAddressMock,
  ]),
} as const;

export const customerDefaultAddressMocks = {
  active: getCustomerDefaultAddress(customerUserResponseMock.addresses ?? []),
  none: getCustomerDefaultAddress(customerNoAddressesUserResponseMock.addresses ?? []),
} as const;

export const customerProfileUpdateSubmissionMock = customerProfileUpdateSubmissionTemplate;

export const customerAddressMutationSubmissionMocks = customerAddressMutationTemplates;

export const customerAddressConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'ADDRESS_CONFLICT',
  message: 'The default address changed while your update was in progress. Reload and try again.',
  source: 'task',
};

export const customerAddressForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only active customer accounts can manage saved addresses.',
  source: 'task',
};

export const customerAddressValidationErrorMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'The submitted address payload is invalid.',
  source: 'swagger',
};
