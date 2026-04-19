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

const normalizeVehicleYear = (value) => {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 4);

  return digits ? Number(digits) : null;
};

const buildVehicleDisplayName = ({ vehicleMake, vehicleModel, vehicleYear }) =>
  [vehicleYear, vehicleMake, vehicleModel]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');

const parseBirthday = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00`
    : value.trim();
  const parsed = new Date(normalizedValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const toDateOnlyString = (value) => {
  const parsedBirthday = parseBirthday(value);
  if (!parsedBirthday) {
    return null;
  }

  const year = parsedBirthday.getFullYear();
  const month = `${parsedBirthday.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsedBirthday.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const buildUsername = (email) => {
  const localPart = normalizeEmail(email).split('@')[0]?.replace(/[^a-z0-9._-]/gi, '');
  return localPart ? localPart.toLowerCase() : 'autocare-user';
};

const request = async (path, options = {}) => {
  const { body, headers, ...rest } = options;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${API_BASE_URL}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
      },
    );
  }

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

export const startGoogleSignup = async (payload) =>
  request('/api/auth/google/signup/start', {
    method: 'POST',
    body: payload,
  });

export const verifyRegistrationOtp = async (payload) =>
  request('/api/auth/register/verify-email', {
    method: 'POST',
    body: payload,
  });

export const verifyGoogleSignupOtp = async (payload) =>
  request('/api/auth/google/signup/verify-email', {
    method: 'POST',
    body: payload,
  });

export const loginAccount = async (payload) =>
  request('/api/auth/login', {
    method: 'POST',
    body: payload,
  });

export const updateCustomerProfile = async ({ userId, birthday, phoneNumber, accessToken }) =>
  request(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    body: {
      birthday: toDateOnlyString(birthday) ?? undefined,
      phone: normalizePhoneNumber(phoneNumber) || undefined,
    },
  });

export const createCustomerVehicle = async ({
  userId,
  licensePlate,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  accessToken,
}) =>
  request('/api/vehicles', {
    method: 'POST',
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    body: {
      userId,
      plateNumber: String(licensePlate ?? '').trim().toUpperCase(),
      make: String(vehicleMake ?? '').trim(),
      model: String(vehicleModel ?? '').trim(),
      year: normalizeVehicleYear(vehicleYear),
    },
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
    birthday: parseBirthday(draftAccount?.birthday ?? profile.birthday ?? accountFallback?.birthday),
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
    vehicleMake: draftAccount?.vehicleMake ?? accountFallback?.vehicleMake ?? '',
    vehicleModel: draftAccount?.vehicleModel ?? accountFallback?.vehicleModel ?? '',
    vehicleYear:
      draftAccount?.vehicleYear ??
      accountFallback?.vehicleYear ??
      null,
    vehicleDisplayName:
      draftAccount?.vehicleDisplayName ??
      accountFallback?.vehicleDisplayName ??
      buildVehicleDisplayName({
        vehicleMake: draftAccount?.vehicleMake ?? accountFallback?.vehicleMake,
        vehicleModel: draftAccount?.vehicleModel ?? accountFallback?.vehicleModel,
        vehicleYear: draftAccount?.vehicleYear ?? accountFallback?.vehicleYear,
      }),
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
