const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export const SESSION_STORAGE_KEY = 'cc_auth_session';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

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

const normalizeSessionUser = (userResponse = {}, fallbackUser = {}) => {
  const mergedUser = {
    ...fallbackUser,
    ...userResponse,
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
    profile: mergedUser.profile ?? fallbackUser.profile ?? null,
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
  if (staffCode.startsWith('ADM-')) return 'admin';
  return 'staff';
};

const accountTypeLabel = {
  staff: 'Staff',
  mechanic: 'Mechanic',
  technician: 'Technician',
  admin: 'Admin',
};

const normalizeManagedStaffAccount = (account) => {
  const accountType = inferAccountType(account);
  const name = buildDisplayName(account);

  return {
    ...account,
    accountType,
    roleLabel: accountTypeLabel[accountType] ?? formatRoleLabel(account?.role),
    displayName: account?.displayName ?? name,
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

const request = async (path, options = {}) => {
  const { body, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
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
  normalizeSession(
    await request('/api/auth/login', {
      method: 'POST',
      body: payload,
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

export const listAdminCustomers = async (accessToken) =>
  request('/api/admin/customers', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((customers) =>
    Array.isArray(customers) ? customers.map((customer) => normalizeCustomerRecord(customer)) : [],
  );

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
  user: normalizeSessionUser(
    {
      id: authenticatedUser?.id ?? authenticatedUser?.userId,
      email: authenticatedUser?.email,
      role: authenticatedUser?.role,
    },
    storedSession?.user ?? {},
  ),
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
