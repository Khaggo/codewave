import type { AccountLifecycleState } from '../auth/identity-foundation';
import type { UpdateAddressRequest, UpdateUserRequest, UpsertAddressRequest } from './requests';
import { usersRoutes } from './requests';
import type { AddressResponse, UserResponse } from './responses';

export type CustomerProfileMobileState =
  | 'active_profile_ready'
  | 'active_profile_incomplete'
  | 'profile_saving'
  | 'profile_forbidden'
  | 'profile_not_found'
  | 'deactivated_account_blocked';

export type CustomerAddressMobileState =
  | 'addresses_loaded'
  | 'no_addresses'
  | 'default_address_ready'
  | 'default_address_switching'
  | 'address_validation_error'
  | 'address_conflict'
  | 'address_forbidden'
  | 'address_not_found';

export interface CustomerProfileStateRule {
  state: CustomerProfileMobileState;
  surface: 'customer-mobile';
  truth: 'users-domain-record' | 'client-guard';
  routeKey: 'getUserById' | 'updateUser';
  description: string;
}

export interface CustomerAddressStateRule {
  state: CustomerAddressMobileState;
  surface: 'customer-mobile';
  truth: 'users-domain-record' | 'client-guard';
  routeKey: 'listAddresses' | 'addAddress' | 'updateAddress';
  description: string;
}

export interface CustomerProfileUpdateSubmission {
  request: UpdateUserRequest;
  requiredLifecycleState: Extract<AccountLifecycleState, 'active'>;
  route: (typeof usersRoutes)['updateUser'];
}

export interface CustomerAddressMutationSubmission {
  routeKey: 'addAddress' | 'updateAddress';
  request: UpsertAddressRequest | UpdateAddressRequest;
  defaultAddressPolicy: 'server-clears-previous-default';
}

export const customerProfileStateRules: CustomerProfileStateRule[] = [
  {
    state: 'active_profile_ready',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'getUserById',
    description: 'The active customer has the profile fields required by the mobile profile flow.',
  },
  {
    state: 'active_profile_incomplete',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'getUserById',
    description: 'The active customer exists but at least one mobile-owned profile field is still missing.',
  },
  {
    state: 'profile_saving',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateUser',
    description: 'The client is submitting a users-domain profile update request.',
  },
  {
    state: 'profile_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'getUserById',
    description: 'The profile route cannot be used without an active customer session.',
  },
  {
    state: 'profile_not_found',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'getUserById',
    description: 'The requested user record does not exist in the users domain.',
  },
  {
    state: 'deactivated_account_blocked',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'getUserById',
    description: 'The account exists but is deactivated and must not be treated as a usable mobile profile session.',
  },
];

export const customerAddressStateRules: CustomerAddressStateRule[] = [
  {
    state: 'addresses_loaded',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'listAddresses',
    description: 'The customer has at least one saved address record.',
  },
  {
    state: 'no_addresses',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'listAddresses',
    description: 'The customer has no saved addresses yet.',
  },
  {
    state: 'default_address_ready',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'listAddresses',
    description: 'One saved address is clearly marked as the current default address.',
  },
  {
    state: 'default_address_switching',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateAddress',
    description: 'The client is updating an address to request a default-address switch.',
  },
  {
    state: 'address_validation_error',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'addAddress',
    description: 'The submitted address payload does not satisfy the users-domain DTO contract.',
  },
  {
    state: 'address_conflict',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateAddress',
    description: 'The client should stop and let backend default-address rules resolve the canonical default state.',
  },
  {
    state: 'address_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listAddresses',
    description: 'The address routes cannot be used without an active customer session.',
  },
  {
    state: 'address_not_found',
    surface: 'customer-mobile',
    truth: 'users-domain-record',
    routeKey: 'updateAddress',
    description: 'The requested address does not belong to the customer record.',
  },
];

const hasRequiredProfileFields = (user: UserResponse): boolean =>
  Boolean(
    user.profile?.firstName?.trim() &&
      user.profile?.lastName?.trim() &&
      user.profile?.phone?.trim() &&
      user.profile?.birthday,
  );

export const getCustomerProfileState = (user: UserResponse): CustomerProfileMobileState => {
  if (!user.isActive) {
    return 'deactivated_account_blocked';
  }

  return hasRequiredProfileFields(user) ? 'active_profile_ready' : 'active_profile_incomplete';
};

export const getCustomerDefaultAddress = (
  addresses: AddressResponse[],
): AddressResponse | null => addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

export const getCustomerAddressState = (
  addresses: AddressResponse[],
): Extract<CustomerAddressMobileState, 'addresses_loaded' | 'no_addresses' | 'default_address_ready'> => {
  if (!addresses.length) {
    return 'no_addresses';
  }

  return getCustomerDefaultAddress(addresses)?.isDefault ? 'default_address_ready' : 'addresses_loaded';
};

export const customerProfileUpdateSubmissionTemplate: CustomerProfileUpdateSubmission = {
  request: {
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+639171234567',
    birthday: '1998-04-12',
  },
  requiredLifecycleState: 'active',
  route: usersRoutes.updateUser,
};

export const customerAddressMutationTemplates = {
  addDefaultAddress: {
    routeKey: 'addAddress',
    request: {
      label: 'Home',
      addressLine1: '123 AutoCare Street',
      addressLine2: 'Barangay Road',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1100',
      isDefault: true,
    },
    defaultAddressPolicy: 'server-clears-previous-default',
  },
  switchDefaultAddress: {
    routeKey: 'updateAddress',
    request: {
      isDefault: true,
    },
    defaultAddressPolicy: 'server-clears-previous-default',
  },
} as const satisfies Record<string, CustomerAddressMutationSubmission>;
