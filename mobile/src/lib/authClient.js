import { Platform } from 'react-native';

const defaultApiBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  defaultApiBaseUrl
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const normalizePhoneNumber = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);

const buildUsername = (email) => {
  const localPart = normalizeEmail(email).split('@')[0]?.replace(/[^a-z0-9._-]/gi, '');
  return localPart ? localPart.toLowerCase() : 'autocare-user';
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
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

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
  request('/api/auth/register/verify-email', {
    method: 'POST',
    body: payload,
  });

export const loginAccount = async (payload) =>
  request('/api/auth/login', {
    method: 'POST',
    body: payload,
  });

export const buildMobileAccountProfile = ({
  session,
  password,
  draftAccount,
  existingAccount,
}) => {
  const user = session?.user ?? {};
  const profile = user.profile ?? {};
  const accountFallback =
    normalizeEmail(existingAccount?.email) === normalizeEmail(user.email) ? existingAccount : null;

  return {
    firstName: draftAccount?.firstName ?? profile.firstName ?? accountFallback?.firstName ?? '',
    lastName: draftAccount?.lastName ?? profile.lastName ?? accountFallback?.lastName ?? '',
    birthday: draftAccount?.birthday ?? accountFallback?.birthday ?? null,
    address: draftAccount?.address ?? accountFallback?.address ?? '',
    city: draftAccount?.city ?? accountFallback?.city ?? '',
    gender: draftAccount?.gender ?? accountFallback?.gender ?? 'Prefer not to say',
    phoneNumber: normalizePhoneNumber(
      draftAccount?.phoneNumber ?? profile.phone ?? accountFallback?.phoneNumber ?? '',
    ),
    email: user.email ?? draftAccount?.email ?? accountFallback?.email ?? '',
    username:
      draftAccount?.username ??
      accountFallback?.username ??
      buildUsername(user.email ?? draftAccount?.email),
    licensePlate: draftAccount?.licensePlate ?? accountFallback?.licensePlate ?? '',
    vehicleModel: draftAccount?.vehicleModel ?? accountFallback?.vehicleModel ?? '',
    password: password ?? accountFallback?.password ?? '',
    profileImage: accountFallback?.profileImage ?? null,
    userId: user.id ?? accountFallback?.userId ?? null,
    role: user.role ?? accountFallback?.role ?? 'customer',
    staffCode: user.staffCode ?? accountFallback?.staffCode ?? null,
    isActive: user.isActive ?? accountFallback?.isActive ?? true,
    accessToken: session?.accessToken ?? accountFallback?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? accountFallback?.refreshToken ?? null,
  };
};

export const getApiBaseUrl = () => API_BASE_URL;
