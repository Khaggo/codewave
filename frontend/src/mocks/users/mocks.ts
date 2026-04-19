import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateAddressRequest,
  UpsertAddressRequest,
} from '../../lib/api/generated/users/requests';
import type { AddressResponse, UserResponse } from '../../lib/api/generated/users/responses';

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

