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

const normalizeSession = (sessionResponse) => {
  const user = sessionResponse?.user ?? {};
  const name = buildDisplayName(user);

  return {
    accessToken: sessionResponse.accessToken,
    refreshToken: sessionResponse.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      roleLabel: formatRoleLabel(user.role),
      name,
      initials: buildInitials(name),
      staffCode: user.staffCode ?? null,
      isActive: user.isActive,
      profile: user.profile ?? null,
    },
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
