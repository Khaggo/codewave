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

const trimOrUndefined = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : undefined;
};

const normalizePhoneNumber = (value) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);

const normalizeAddressRecord = (address) => {
  if (!address || typeof address !== 'object') {
    return null;
  }

  return {
    id: address.id ?? null,
    userId: address.userId ?? null,
    label: trimOrUndefined(address.label) ?? null,
    addressLine1: trimOrUndefined(address.addressLine1) ?? '',
    addressLine2: trimOrUndefined(address.addressLine2) ?? null,
    city: trimOrUndefined(address.city) ?? '',
    province: trimOrUndefined(address.province) ?? '',
    postalCode: trimOrUndefined(address.postalCode) ?? null,
    isDefault: Boolean(address.isDefault),
    createdAt: address.createdAt ?? null,
    updatedAt: address.updatedAt ?? null,
  };
};

const formatAddressSummary = (address) =>
  [address?.addressLine1, address?.addressLine2, address?.city, address?.province, address?.postalCode]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ');

const selectDefaultAddress = (addresses) =>
  addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

const selectPrimaryVehicle = (vehicles, preferredVehicleId) => {
  if (preferredVehicleId) {
    const matchingVehicle = vehicles.find((vehicle) => vehicle.id === preferredVehicleId);
    if (matchingVehicle) {
      return matchingVehicle;
    }
  }

  return vehicles[0] ?? null;
};

const deriveAccountState = (user) => (user?.isActive === false ? 'deactivated' : 'active');

const deriveProfileState = ({ firstName, lastName, phoneNumber, birthday }) =>
  firstName && lastName && phoneNumber && birthday ? 'complete' : 'incomplete';

export const customerMobileGuardMessages = {
  unauthorized_session:
    'Sign in with a customer account before opening that mobile workspace.',
  staff_session_blocked:
    'This mobile app is for customer accounts only. Staff roles should use the web portal.',
  deactivated_customer_blocked:
    'This customer account is deactivated. Contact support if access should be restored.',
};

export const isCustomerMobileRole = (role) => !role || role === 'customer';

export const getCustomerMobileSessionAccessState = (account) => {
  if (!account?.accessToken || !account?.userId) {
    return 'unauthorized_session';
  }

  if (!isCustomerMobileRole(account.role)) {
    return 'staff_session_blocked';
  }

  if (account.isActive === false) {
    return 'deactivated_customer_blocked';
  }

  return 'customer_session_active';
};

const buildAuthorizedHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const normalizeAddressPayload = (payload = {}) => {
  const normalizedPayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'label')) {
    normalizedPayload.label = trimOrUndefined(payload.label);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'addressLine1')) {
    normalizedPayload.addressLine1 = trimOrUndefined(payload.addressLine1) ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'addressLine2')) {
    normalizedPayload.addressLine2 = trimOrUndefined(payload.addressLine2);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'city')) {
    normalizedPayload.city = trimOrUndefined(payload.city) ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'province')) {
    normalizedPayload.province = trimOrUndefined(payload.province) ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'postalCode')) {
    normalizedPayload.postalCode = trimOrUndefined(payload.postalCode);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isDefault')) {
    normalizedPayload.isDefault = Boolean(payload.isDefault);
  }

  return normalizedPayload;
};

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

const normalizeVehiclePayload = (payload = {}) => {
  const normalizedPayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'userId')) {
    normalizedPayload.userId = String(payload.userId ?? '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'plateNumber')) {
    normalizedPayload.plateNumber = String(payload.plateNumber ?? '').trim().toUpperCase();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'make')) {
    normalizedPayload.make = trimOrUndefined(payload.make) ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'model')) {
    normalizedPayload.model = trimOrUndefined(payload.model) ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'year')) {
    normalizedPayload.year = normalizeVehicleYear(payload.year);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'color')) {
    normalizedPayload.color = trimOrUndefined(payload.color);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'vin')) {
    normalizedPayload.vin = trimOrUndefined(payload.vin);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
    normalizedPayload.notes = trimOrUndefined(payload.notes);
  }

  return normalizedPayload;
};

export const normalizeVehicleRecord = (vehicle) => {
  if (!vehicle || typeof vehicle !== 'object') {
    return null;
  }

  const plateNumber = String(vehicle.plateNumber ?? '').trim().toUpperCase();
  const make = trimOrUndefined(vehicle.make) ?? '';
  const model = trimOrUndefined(vehicle.model) ?? '';
  const year = normalizeVehicleYear(vehicle.year);

  if (!vehicle.id && !plateNumber && !make && !model && year === null) {
    return null;
  }

  return {
    id: vehicle.id ?? null,
    userId: vehicle.userId ?? null,
    plateNumber,
    make,
    model,
    year,
    color: trimOrUndefined(vehicle.color) ?? null,
    vin: trimOrUndefined(vehicle.vin) ?? null,
    notes: trimOrUndefined(vehicle.notes) ?? null,
    createdAt: vehicle.createdAt ?? null,
    updatedAt: vehicle.updatedAt ?? null,
    displayName: buildVehicleDisplayName({
      vehicleMake: make,
      vehicleModel: model,
      vehicleYear: year,
    }),
  };
};

const buildVehicleRecordFromFlatFields = ({ source, userId }) => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  return normalizeVehicleRecord({
    id: source.primaryVehicleId ?? source.vehicleId ?? null,
    userId: userId ?? source.userId ?? null,
    plateNumber: source.licensePlate,
    make: source.vehicleMake,
    model: source.vehicleModel,
    year: source.vehicleYear,
    color: source.vehicleColor,
    vin: source.vehicleVin,
    notes: source.vehicleNotes,
    createdAt: source.vehicleCreatedAt ?? null,
    updatedAt: source.vehicleUpdatedAt ?? null,
  });
};

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

export const requestForgotPasswordOtp = async ({ email }) =>
  request('/api/auth/password/forgot/request', {
    method: 'POST',
    body: {
      email,
    },
  });

export const resetPasswordWithOtp = async ({ enrollmentId, otp, newPassword }) =>
  request('/api/auth/password/forgot/reset', {
    method: 'POST',
    body: {
      enrollmentId,
      otp,
      newPassword,
    },
  });

export const requestChangePasswordOtp = async ({ currentPassword, accessToken }) =>
  request('/api/auth/password/change/request', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      currentPassword,
    },
  });

export const confirmChangePasswordWithOtp = async ({
  enrollmentId,
  otp,
  currentPassword,
  newPassword,
  accessToken,
}) =>
  request('/api/auth/password/change/confirm', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      enrollmentId,
      otp,
      currentPassword,
      newPassword,
    },
  });

export const startDeleteAccountOtp = async ({ currentPassword, accessToken }) =>
  request('/api/auth/account/delete/start', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      currentPassword,
    },
  });

export const verifyDeleteAccountOtp = async ({ enrollmentId, otp, accessToken }) =>
  request('/api/auth/account/delete/verify', {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      enrollmentId,
      otp,
    },
  });

export const getCustomerUser = async ({ userId, accessToken }) =>
  request(`/api/users/${userId}`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

export const listCustomerAddresses = async ({ userId, accessToken }) =>
  request(`/api/users/${userId}/addresses`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

export const addCustomerAddress = async ({ userId, address, accessToken }) =>
  request(`/api/users/${userId}/addresses`, {
    method: 'POST',
    headers: buildAuthorizedHeaders(accessToken),
    body: normalizeAddressPayload(address),
  });

export const updateCustomerAddress = async ({ userId, addressId, address, accessToken }) =>
  request(`/api/users/${userId}/addresses/${addressId}`, {
    method: 'PATCH',
    headers: buildAuthorizedHeaders(accessToken),
    body: normalizeAddressPayload(address),
  });

export const updateCustomerProfile = async ({
  userId,
  firstName,
  lastName,
  birthday,
  phoneNumber,
  accessToken,
}) =>
  request(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: buildAuthorizedHeaders(accessToken),
    body: {
      firstName: trimOrUndefined(firstName),
      lastName: trimOrUndefined(lastName),
      birthday: toDateOnlyString(birthday) ?? undefined,
      phone: normalizePhoneNumber(phoneNumber) || undefined,
    },
  });

export const getCustomerVehicle = async ({ vehicleId, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select an owned vehicle before loading its detail.', 400, {
      path: '/api/vehicles/:id',
    });
  }

  return normalizeVehicleRecord(
    await request(`/api/vehicles/${vehicleId}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(accessToken),
    }),
  );
};

export const listCustomerVehicles = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError('You need an active customer session before vehicles can load.', 401, {
      path: '/api/users/:id/vehicles',
    });
  }

  const vehicles = await request(`/api/users/${userId}/vehicles`, {
    method: 'GET',
    headers: buildAuthorizedHeaders(accessToken),
  });

  return Array.isArray(vehicles) ? vehicles.map(normalizeVehicleRecord).filter(Boolean) : [];
};

export const createCustomerVehicle = async ({
  userId,
  licensePlate,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  color,
  vin,
  notes,
  accessToken,
}) => {
  if (!userId) {
    throw new ApiError('You need an active customer session before saving a vehicle.', 401, {
      path: '/api/vehicles',
    });
  }

  return normalizeVehicleRecord(
    await request('/api/vehicles', {
      method: 'POST',
      headers: buildAuthorizedHeaders(accessToken),
      body: normalizeVehiclePayload({
        userId,
        plateNumber: licensePlate,
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear,
        color,
        vin,
        notes,
      }),
    }),
  );
};

export const updateCustomerVehicle = async ({ vehicleId, vehicle, accessToken }) => {
  if (!vehicleId) {
    throw new ApiError('Select an owned vehicle before saving changes.', 400, {
      path: '/api/vehicles/:id',
    });
  }

  return normalizeVehicleRecord(
    await request(`/api/vehicles/${vehicleId}`, {
      method: 'PATCH',
      headers: buildAuthorizedHeaders(accessToken),
      body: normalizeVehiclePayload(vehicle),
    }),
  );
};

export const buildMobileAccountProfile = ({
  session,
  password,
  draftAccount,
  existingAccount,
}) => {
  const user = session?.user ?? {};
  const accountFallback =
    normalizeEmail(existingAccount?.email) === normalizeEmail(user.email) ? existingAccount : null;
  const profile = user.profile ?? {};
  const normalizedAddresses = Array.isArray(user.addresses)
    ? user.addresses.map(normalizeAddressRecord).filter(Boolean)
    : Array.isArray(existingAccount?.addresses)
      ? existingAccount.addresses.map(normalizeAddressRecord).filter(Boolean)
      : [];
  const defaultAddress = selectDefaultAddress(normalizedAddresses);
  const normalizedDraftVehicles = Array.isArray(draftAccount?.ownedVehicles)
    ? draftAccount.ownedVehicles.map(normalizeVehicleRecord).filter(Boolean)
    : [];
  const normalizedFallbackVehicles = Array.isArray(accountFallback?.ownedVehicles)
    ? accountFallback.ownedVehicles.map(normalizeVehicleRecord).filter(Boolean)
    : [];
  const draftVehicleFallback = buildVehicleRecordFromFlatFields({
    source: draftAccount,
    userId: user.id ?? accountFallback?.userId ?? null,
  });
  const accountVehicleFallback = buildVehicleRecordFromFlatFields({
    source: accountFallback,
    userId: user.id ?? accountFallback?.userId ?? null,
  });
  const normalizedVehicles = normalizedDraftVehicles.length
    ? normalizedDraftVehicles
    : normalizedFallbackVehicles.length
      ? normalizedFallbackVehicles
      : draftVehicleFallback
        ? [draftVehicleFallback]
        : accountVehicleFallback
          ? [accountVehicleFallback]
          : [];
  const primaryVehicle = selectPrimaryVehicle(
    normalizedVehicles,
    draftAccount?.primaryVehicleId ?? accountFallback?.primaryVehicleId ?? null,
  );
  const firstName =
    draftAccount?.firstName ?? profile.firstName ?? accountFallback?.firstName ?? '';
  const lastName =
    draftAccount?.lastName ?? profile.lastName ?? accountFallback?.lastName ?? '';
  const phoneNumber = normalizePhoneNumber(
    draftAccount?.phoneNumber ?? profile.phone ?? accountFallback?.phoneNumber ?? '',
  );
  const birthday = parseBirthday(draftAccount?.birthday ?? profile.birthday ?? accountFallback?.birthday);
  const accountState = deriveAccountState(user);
  const profileState = deriveProfileState({
    firstName,
    lastName,
    phoneNumber,
    birthday,
  });

  return {
    firstName,
    lastName,
    birthday,
    address: formatAddressSummary(defaultAddress) || draftAccount?.address || accountFallback?.address || '',
    addresses: normalizedAddresses,
    defaultAddress,
    defaultAddressId: defaultAddress?.id ?? null,
    city: defaultAddress?.city ?? draftAccount?.city ?? accountFallback?.city ?? '',
    gender: draftAccount?.gender ?? accountFallback?.gender ?? 'Prefer not to say',
    phoneNumber,
    email: user.email ?? draftAccount?.email ?? accountFallback?.email ?? '',
    username:
      draftAccount?.username ??
      accountFallback?.username ??
      buildUsername(user.email ?? draftAccount?.email),
    ownedVehicles: normalizedVehicles,
    primaryVehicle,
    primaryVehicleId: primaryVehicle?.id ?? null,
    licensePlate:
      primaryVehicle?.plateNumber ??
      String(draftAccount?.licensePlate ?? accountFallback?.licensePlate ?? '').trim().toUpperCase(),
    vehicleMake: primaryVehicle?.make ?? draftAccount?.vehicleMake ?? accountFallback?.vehicleMake ?? '',
    vehicleModel: primaryVehicle?.model ?? draftAccount?.vehicleModel ?? accountFallback?.vehicleModel ?? '',
    vehicleYear:
      primaryVehicle?.year ??
      draftAccount?.vehicleYear ??
      accountFallback?.vehicleYear ??
      null,
    vehicleDisplayName:
      primaryVehicle?.displayName ??
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
    accountState,
    profileState,
    accessToken: session?.accessToken ?? accountFallback?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? accountFallback?.refreshToken ?? null,
  };
};

export const getApiBaseUrl = () => API_BASE_URL;
