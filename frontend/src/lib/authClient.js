import { deriveApiBaseUrl } from './apiBaseUrl.mjs';
import { normalizeAdminCustomerListResponse } from './adminCustomerListResponse.mjs';
import {
  mapAuthoritativeStaffProfile,
  normalizeStaffPhoneNumber,
  requireAuthoritativeStaffPhone,
} from './staffProfileSession.mjs';
import { normalizeStaffLoginResponse, stripCredentialSecrets } from './staffAccountAuthContract.mjs';

const API_BASE_URL = deriveApiBaseUrl({
  configuredBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000',
  browserHostname: typeof window === 'undefined' ? undefined : window.location.hostname,
});

export const SESSION_STORAGE_KEY = 'cc_auth_session';
export const STAFF_SESSION_UNAUTHORIZED_EVENT = 'cc-staff-session-unauthorized';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const notifyStaffSessionUnauthorized = (details = null) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(STAFF_SESSION_UNAUTHORIZED_EVENT, {
      detail: details ?? null,
    }),
  );
};

const formatRoleLabel = (role) =>
  String(role ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildDisplayName = (user) => {
  const firstName = user?.profile?.firstName?.trim();
  const lastName = user?.profile?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  return user?.email?.split('@')[0] ?? 'Account';
};

const buildInitials = (name) =>
  String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AC';

const normalizePhoneNumber = normalizeStaffPhoneNumber;

const normalizeSessionUser = (userResponse = {}, fallbackUser = {}) => {
  const authoritativeProfile = mapAuthoritativeStaffProfile(userResponse, fallbackUser);
  const mergedUser = {
    ...fallbackUser,
    ...userResponse,
    profile: authoritativeProfile.profile,
    phone: authoritativeProfile.phone,
  };
  const name = buildDisplayName(mergedUser);

  return {
    id: mergedUser.id ?? mergedUser.userId ?? fallbackUser.id ?? null,
    email: mergedUser.email ?? fallbackUser.email ?? null,
    role: mergedUser.role ?? fallbackUser.role ?? null,
    roleLabel: formatRoleLabel(mergedUser.role ?? fallbackUser.role),
    name,
    initials: buildInitials(name),
    staffCode:
      mergedUser.staffCode !== undefined
        ? mergedUser.staffCode
        : fallbackUser.staffCode ?? null,
    isActive:
      mergedUser.isActive !== undefined
        ? mergedUser.isActive
        : fallbackUser.isActive ?? true,
    phone: authoritativeProfile.phone,
    profile: authoritativeProfile.profile,
  };
};

const normalizeSession = (sessionResponse) => {
  return {
    accessToken: sessionResponse.accessToken,
    refreshToken: sessionResponse.refreshToken,
    user: normalizeSessionUser(sessionResponse?.user),
  };
};

const inferAccountType = (account) => {
  const explicitType = account?.accountType;
  if (explicitType) return explicitType;

  const staffCode = String(account?.staffCode ?? '').toUpperCase();
  if (staffCode.startsWith('MEC-')) return 'mechanic';
  if (staffCode.startsWith('TEC-')) return 'technician';
  if (staffCode.startsWith('HTC-')) return 'head_technician';
  if (staffCode.startsWith('ADM-')) return 'admin';
  return 'staff';
};

const accountTypeLabel = {
  staff: 'Staff',
  mechanic: 'Mechanic',
  technician: 'Technician',
  head_technician: 'Head Technician',
  admin: 'Admin',
};

const normalizeManagedStaffAccount = (account) => {
  const safeAccount = stripCredentialSecrets(account);
  const accountType = inferAccountType(safeAccount);
  const name = buildDisplayName(safeAccount);

  return {
    ...safeAccount,
    accountType,
    roleLabel: accountTypeLabel[accountType] ?? formatRoleLabel(safeAccount?.role),
    displayName: safeAccount?.displayName ?? name,
    initials: buildInitials(name),
  };
};

const normalizeCustomerRecord = (customer) => {
  const name = buildDisplayName(customer);
  const vehicles = Array.isArray(customer?.vehicles) ? customer.vehicles : [];
  const addresses = Array.isArray(customer?.addresses) ? customer.addresses : [];

  return {
    ...customer,
    displayName: customer?.displayName ?? name,
    vehicles,
    addresses,
    defaultAddress: customer?.defaultAddress ?? addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
    vehicleCount: customer?.vehicleCount ?? vehicles.length,
  };
};

const normalizeWalkInCustomerResult = (result = {}) => ({
  customerUserId: result.customerUserId ?? null,
  customerIdentityKind: result.customerIdentityKind ?? 'walk_in',
  vehicleId: result.vehicleId ?? null,
  customerLabel: result.customerLabel ?? 'Customer reference unavailable',
  vehicleReference: result.vehicleReference ?? 'Vehicle reference unavailable',
  vehicleLabel: result.vehicleLabel ?? 'Vehicle reference unavailable',
  arrivalType: result.arrivalType === 'with_booking' ? 'with_booking' : 'walk_in',
  customerCreated: Boolean(result.customerCreated),
  customerReused: Boolean(result.customerReused),
  vehicleCreated: Boolean(result.vehicleCreated),
  vehicleReused: Boolean(result.vehicleReused),
});

const normalizeTechnicianProfile = (profile) => ({
  ...profile,
  specialties: Array.isArray(profile?.specialties) ? profile.specialties : [],
  fullName: String(profile?.fullName ?? '').trim(),
  code: profile?.code ?? null,
  isActive: profile?.isActive !== false,
});

const AUTH_REQUEST_TIMEOUT_MS = 12000;

const request = async (path, options = {}) => {
  const { body, headers, timeoutMs = AUTH_REQUEST_TIMEOUT_MS, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('Authentication request timed out. Please try again.', 408, null);
    }

    throw new ApiError(
      'Unable to reach AutoCare. Check your connection and try again.',
      0,
      null,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && headers?.Authorization) {
      notifyStaffSessionUnauthorized({
        path,
        source: 'authClient',
      });
    }

    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
};

export const registerAccount = async (payload) =>
  request('/api/auth/register', {
    method: 'POST',
    body: payload,
  });

export const verifyRegistrationOtp = async (payload) =>
  normalizeSession(
    await request('/api/auth/register/verify-email', {
      method: 'POST',
      body: payload,
    }),
  );

export const loginAccount = async (payload) =>
  normalizeStaffLoginResponse(
    await request('/api/auth/login', {
      method: 'POST',
      body: payload,
    }),
    normalizeSession,
  );

export const completeRequiredStaffPasswordChange = async ({ passwordChangeToken, newPassword }) =>
  normalizeSession(
    await request('/api/auth/password/change-required', {
      method: 'POST',
      body: { passwordChangeToken, newPassword },
    }),
  );

export const createStaffAccount = async (payload, accessToken) =>
  request('/api/admin/staff-accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeManagedStaffAccount);

export const listStaffAccounts = async (accessToken) =>
  request('/api/admin/staff-accounts', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((accounts) =>
    Array.isArray(accounts) ? accounts.map((account) => normalizeManagedStaffAccount(account)) : [],
  );

export const updateStaffAccountStatus = async (userId, payload, accessToken) =>
  request(`/api/admin/staff-accounts/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeManagedStaffAccount);

export const retryStaffCredentialDelivery = async (email, accessToken) =>
  request('/api/admin/staff-accounts/credentials/retry', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { email },
  }).then(normalizeManagedStaffAccount);

export const listTechnicianProfiles = async (accessToken, options = {}) => {
  const params = new URLSearchParams();
  if (options.specialty) {
    params.set('specialty', String(options.specialty).trim());
  }
  if (options.activeOnly === false) {
    params.set('activeOnly', 'false');
  }

  const query = params.size ? `?${params.toString()}` : '';

  return request(`/api/admin/technician-profiles${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((profiles) =>
    Array.isArray(profiles) ? profiles.map((profile) => normalizeTechnicianProfile(profile)) : [],
  );
};

export const createTechnicianProfile = async (payload, accessToken) =>
  request('/api/admin/technician-profiles', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeTechnicianProfile);

export const updateTechnicianProfile = async (profileId, payload, accessToken) =>
  request(`/api/admin/technician-profiles/${profileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeTechnicianProfile);

export const listAdminCustomers = async (accessToken, options = {}) => {
  const params = new URLSearchParams();
  if (options.search) params.set('search', String(options.search).trim());
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.customerId) params.set('customerId', options.customerId);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.paged) params.set('paged', 'true');
  const query = params.toString();
  return request('/api/admin/customers' + (query ? '?' + query : ''), {
    method: 'GET',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((response) => normalizeAdminCustomerListResponse(response, {
    paged: Boolean(options.paged),
    normalizeItem: normalizeCustomerRecord,
  }));
};

export const createWalkInCustomer = async (payload, accessToken) =>
  request('/api/users/walk-in', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeWalkInCustomerResult);

export const updateAdminCustomerStatus = async (userId, payload, accessToken) =>
  request(`/api/admin/customers/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  }).then(normalizeCustomerRecord);

export const updateStaffPortalProfile = async ({
  userId,
  accessToken,
  firstName,
  lastName,
}) =>
  normalizeSessionUser(
    await request(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        firstName: String(firstName ?? '').trim() || undefined,
        lastName: String(lastName ?? '').trim() || undefined,
      },
    }),
  );

export const requestStaffPhoneChangeOtp = async ({
  accessToken,
  phoneNumber,
}) =>
  request('/api/auth/staff/profile/phone/change/request', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      phone: normalizePhoneNumber(phoneNumber),
    },
  });

export const confirmStaffPhoneChangeOtp = async ({
  accessToken,
  enrollmentId,
  otp,
  phoneNumber,
}) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const updatedUser = normalizeSessionUser(
    await request('/api/auth/staff/profile/phone/change/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        enrollmentId,
        otp: String(otp ?? '').trim(),
        phone: normalizedPhone,
      },
    }),
  );
  requireAuthoritativeStaffPhone(updatedUser, normalizedPhone);
  return updatedUser;
};

export const refreshAuthSession = async (refreshToken) =>
  normalizeSession(
    await request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),
  );

export const fetchAuthenticatedUser = async (accessToken) =>
  request('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const hydrateStoredSessionFromAuthenticatedUser = (storedSession, authenticatedUser) => ({
  ...storedSession,
  user: normalizeSessionUser(authenticatedUser, storedSession?.user ?? {}),
});

export const loadStoredSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};
