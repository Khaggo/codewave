import type { RouteContract } from '../shared';

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthday?: string;
}

export interface UpsertAddressRequest {
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
  isDefault?: boolean;
}

export type UpdateAddressRequest = Partial<UpsertAddressRequest>;

export const usersRoutes: Record<string, RouteContract> = {
  createUser: {
    method: 'POST',
    path: '/api/users',
    status: 'live',
    source: 'swagger',
  },
  getUserById: {
    method: 'GET',
    path: '/api/users/:id',
    status: 'live',
    source: 'swagger',
  },
  updateUser: {
    method: 'PATCH',
    path: '/api/users/:id',
    status: 'live',
    source: 'swagger',
  },
  listAddresses: {
    method: 'GET',
    path: '/api/users/:id/addresses',
    status: 'live',
    source: 'swagger',
  },
  addAddress: {
    method: 'POST',
    path: '/api/users/:id/addresses',
    status: 'live',
    source: 'swagger',
  },
  updateAddress: {
    method: 'PATCH',
    path: '/api/users/:id/addresses/:addressId',
    status: 'live',
    source: 'swagger',
  },
};

