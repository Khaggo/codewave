import { ApiError, getApiBaseUrl } from './authClient';

const API_BASE_URL = getApiBaseUrl();
const BOOKING_DISCOVERY_REQUEST_TIMEOUT_MS = 8000;

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const asArray = (value) => (Array.isArray(value) ? value : []);

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = BOOKING_DISCOVERY_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
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

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const formatClockLabel = (value) => {
  const normalizedValue = String(value ?? '').trim();
  const match = /^(\d{2}):(\d{2})$/.exec(normalizedValue);

  if (!match) {
    return normalizedValue || '--';
  }

  const hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHour}:${minutes} ${meridiem}`;
};

const buildVehicleLabel = (vehicle) =>
  [vehicle?.year, vehicle?.make, vehicle?.model]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');

/**
 * @typedef {Object} BookingServiceRecord
 * @property {string} id
 * @property {string | null | undefined} categoryId
 * @property {string} name
 * @property {string | null | undefined} description
 * @property {number} durationMinutes
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BookingTimeSlotRecord
 * @property {string} id
 * @property {string} label
 * @property {string} startTime
 * @property {string} endTime
 * @property {number} capacity
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} OwnedVehicleRecord
 * @property {string} id
 * @property {string} userId
 * @property {string} plateNumber
 * @property {string} make
 * @property {string} model
 * @property {number} year
 * @property {string | null | undefined} color
 * @property {string | null | undefined} vin
 * @property {string | null | undefined} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BookingDiscoverySnapshot
 * @property {BookingServiceRecord[]} services
 * @property {BookingTimeSlotRecord[]} timeSlots
 * @property {OwnedVehicleRecord[]} vehicles
 */

export const bookingDiscoveryFixtures = {
  happy: {
    services: [
      {
        id: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
        categoryId: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
        name: 'Oil Change',
        description: 'Replace engine oil and inspect basic consumables.',
        durationMinutes: 45,
        isActive: true,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
    timeSlots: [
      {
        id: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
        label: 'Morning Slot',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 4,
        isActive: true,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
    vehicles: [
      {
        id: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
        userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
        color: 'Silver',
        vin: null,
        notes: null,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
  },
  empty: {
    services: [],
    timeSlots: [
      {
        id: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
        label: 'Morning Slot',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 4,
        isActive: true,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
    vehicles: [
      {
        id: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
        userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
        color: 'Silver',
        vin: null,
        notes: null,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
  },
  unavailable: {
    services: [
      {
        id: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
        categoryId: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
        name: 'Oil Change',
        description: 'Replace engine oil and inspect basic consumables.',
        durationMinutes: 45,
        isActive: true,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
    timeSlots: [
      {
        id: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
        label: 'Morning Slot',
        startTime: '09:00',
        endTime: '10:00',
        capacity: 4,
        isActive: false,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
    vehicles: [
      {
        id: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
        userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
        color: 'Silver',
        vin: null,
        notes: null,
        createdAt: '2026-03-25T15:00:00.000Z',
        updatedAt: '2026-03-25T15:00:00.000Z',
      },
    ],
  },
  unauthorized: {
    services: [],
    timeSlots: [],
    vehicles: [],
    error: {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
  },
};

export const formatBookingServiceDuration = (durationMinutes) => {
  const totalMinutes = Number(durationMinutes);

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return 'Duration unavailable';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
};

export const formatBookingTimeSlotWindow = (timeSlot) => {
  if (!timeSlot) {
    return 'Time unavailable';
  }

  return `${formatClockLabel(timeSlot.startTime)} - ${formatClockLabel(timeSlot.endTime)}`;
};

export const buildOwnedVehicleLabel = (vehicle) =>
  buildVehicleLabel(vehicle) || String(vehicle?.plateNumber ?? '').trim() || 'Owned vehicle';

export const toBookingDateString = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const listBookingServices = async () =>
  asArray(
    await request('/api/services', {
      method: 'GET',
    }),
  );

export const listBookingTimeSlots = async () =>
  asArray(
    await request('/api/time-slots', {
      method: 'GET',
    }),
  );

export const listOwnedVehicles = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError(
      'You need an active customer session before booking discovery can load.',
      401,
      {
        path: '/api/users/:id/vehicles',
      },
    );
  }

  return asArray(
    await request(`/api/users/${userId}/vehicles`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  );
};

const loadDiscoverySection = async (label, loadSection) => {
  try {
    return await loadSection();
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      throw new ApiError(`${label} request failed. ${error.message}`, error.status, error.details);
    }

    throw error;
  }
};

export const loadBookingDiscoverySnapshot = async ({ userId, accessToken }) => {
  const services = await loadDiscoverySection('Booking services', () => listBookingServices());
  const timeSlots = await loadDiscoverySection('Booking time slots', () =>
    listBookingTimeSlots(),
  );
  const vehicles = await loadDiscoverySection('Eligible vehicles', () =>
    listOwnedVehicles({ userId, accessToken }),
  );

  return {
    services,
    timeSlots,
    vehicles,
  };
};

export const createCustomerBooking = async ({
  userId,
  vehicleId,
  timeSlotId,
  scheduledDate,
  serviceIds,
  notes,
  accessToken,
}) =>
  request('/api/bookings', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: {
      userId,
      vehicleId,
      timeSlotId,
      scheduledDate,
      serviceIds,
      notes: notes ? String(notes).trim() : undefined,
    },
  });

export const getBookingById = async ({ bookingId, accessToken }) => {
  if (!bookingId) {
    throw new ApiError('Select a booking before loading its detail.', 400, {
      path: '/api/bookings/:id',
    });
  }

  return request(`/api/bookings/${bookingId}`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
};

export const listCustomerBookings = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError(
      'You need an active customer session before booking history can load.',
      401,
      {
        path: '/api/users/:id/bookings',
      },
    );
  }

  return asArray(
    await request(`/api/users/${userId}/bookings`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  );
};
