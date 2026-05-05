import { ApiError, getApiBaseUrl, normalizeVehicleRecord } from './authClient';

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

const BOOKING_AVAILABILITY_DAY_STATUSES = new Set([
  'bookable',
  'limited',
  'full',
  'outside_window',
  'no_active_slots',
]);
const BOOKING_AVAILABILITY_SLOT_STATUSES = new Set(['available', 'full']);

const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());

  if (!match) {
    return null;
  }

  const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const normalizeIsoDateOnly = (value, fallbackValue = '') => {
  const parsedDate = parseDateOnly(value);
  return parsedDate ? toBookingDateString(parsedDate) : fallbackValue;
};

const addDays = (value, offsetDays) => {
  const parsedDate = value instanceof Date ? new Date(value) : parseDateOnly(value);

  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const nextDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  nextDate.setDate(nextDate.getDate() + offsetDays);
  return nextDate;
};

const normalizeBookingAvailabilitySlot = (slot) => {
  const capacity = Number(slot?.capacity);
  const bookingCount = Number(slot?.bookingCount);
  const remainingCapacity = Number(slot?.remainingCapacity);
  const normalizedCapacity = Number.isFinite(capacity) && capacity >= 0 ? capacity : 0;
  const normalizedBookingCount = Number.isFinite(bookingCount) && bookingCount >= 0 ? bookingCount : 0;
  const normalizedRemainingCapacity =
    Number.isFinite(remainingCapacity) && remainingCapacity >= 0
      ? remainingCapacity
      : Math.max(0, normalizedCapacity - normalizedBookingCount);
  const status =
    BOOKING_AVAILABILITY_SLOT_STATUSES.has(slot?.status)
      ? slot.status
      : normalizedRemainingCapacity > 0
        ? 'available'
        : 'full';

  return {
    timeSlotId: String(slot?.timeSlotId ?? '').trim(),
    label: String(slot?.label ?? '').trim() || 'Slot',
    startTime: String(slot?.startTime ?? '').trim(),
    endTime: String(slot?.endTime ?? '').trim(),
    capacity: normalizedCapacity,
    bookingCount: normalizedBookingCount,
    remainingCapacity: normalizedRemainingCapacity,
    status,
    isAvailable:
      typeof slot?.isAvailable === 'boolean' ? slot.isAvailable : status === 'available',
  };
};

const normalizeBookingAvailabilityDay = (day) => {
  const slots = asArray(day?.slots).map(normalizeBookingAvailabilitySlot);
  const totalCapacity = Number(day?.totalCapacity);
  const remainingCapacity = Number(day?.remainingCapacity);
  const activeSlotCount = Number(day?.activeSlotCount);
  const availableSlotCount = Number(day?.availableSlotCount);
  const normalizedTotalCapacity =
    Number.isFinite(totalCapacity) && totalCapacity >= 0
      ? totalCapacity
      : slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const normalizedRemainingCapacity =
    Number.isFinite(remainingCapacity) && remainingCapacity >= 0
      ? remainingCapacity
      : slots.reduce((sum, slot) => sum + slot.remainingCapacity, 0);
  const normalizedActiveSlotCount =
    Number.isFinite(activeSlotCount) && activeSlotCount >= 0 ? activeSlotCount : slots.length;
  const normalizedAvailableSlotCount =
    Number.isFinite(availableSlotCount) && availableSlotCount >= 0
      ? availableSlotCount
      : slots.filter((slot) => slot.isAvailable).length;
  const fallbackStatus =
    normalizedAvailableSlotCount === 0
      ? normalizedActiveSlotCount === 0
        ? 'no_active_slots'
        : 'full'
      : normalizedRemainingCapacity < normalizedTotalCapacity
        ? 'limited'
        : 'bookable';

  return {
    scheduledDate: normalizeIsoDateOnly(day?.scheduledDate),
    status: BOOKING_AVAILABILITY_DAY_STATUSES.has(day?.status) ? day.status : fallbackStatus,
    isBookable:
      typeof day?.isBookable === 'boolean'
        ? day.isBookable
        : normalizedAvailableSlotCount > 0,
    activeSlotCount: normalizedActiveSlotCount,
    availableSlotCount: normalizedAvailableSlotCount,
    totalCapacity: normalizedTotalCapacity,
    remainingCapacity: normalizedRemainingCapacity,
    slots,
  };
};

export const createEmptyBookingAvailability = () => ({
  generatedAt: '',
  startDate: '',
  endDate: '',
  minBookableDate: '',
  maxBookableDate: '',
  days: [],
});

const normalizeBookingAvailability = (payload, query) => {
  const fallbackStartDate = normalizeIsoDateOnly(query?.startDate);
  const fallbackEndDate = normalizeIsoDateOnly(query?.endDate);
  const days = asArray(payload?.days)
    .map(normalizeBookingAvailabilityDay)
    .filter((day) => Boolean(day.scheduledDate))
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate));

  return {
    generatedAt: String(payload?.generatedAt ?? '').trim(),
    startDate: normalizeIsoDateOnly(payload?.startDate, fallbackStartDate),
    endDate: normalizeIsoDateOnly(payload?.endDate, fallbackEndDate),
    minBookableDate: normalizeIsoDateOnly(payload?.minBookableDate, fallbackStartDate),
    maxBookableDate: normalizeIsoDateOnly(payload?.maxBookableDate, fallbackEndDate),
    days,
  };
};

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
 * @typedef {Object} BookingAvailabilitySlotRecord
 * @property {string} timeSlotId
 * @property {string} label
 * @property {string} startTime
 * @property {string} endTime
 * @property {number} capacity
 * @property {number} bookingCount
 * @property {number} remainingCapacity
 * @property {'available' | 'full'} status
 * @property {boolean} isAvailable
 */

/**
 * @typedef {Object} BookingAvailabilityDayRecord
 * @property {string} scheduledDate
 * @property {'bookable' | 'limited' | 'full' | 'outside_window' | 'no_active_slots'} status
 * @property {boolean} isBookable
 * @property {number} activeSlotCount
 * @property {number} availableSlotCount
 * @property {number} totalCapacity
 * @property {number} remainingCapacity
 * @property {BookingAvailabilitySlotRecord[]} slots
 */

/**
 * @typedef {Object} BookingAvailabilityRecord
 * @property {string} generatedAt
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} minBookableDate
 * @property {string} maxBookableDate
 * @property {BookingAvailabilityDayRecord[]} days
 */

/**
 * @typedef {Object} BookingDiscoverySnapshot
 * @property {BookingServiceRecord[]} services
 * @property {BookingTimeSlotRecord[]} timeSlots
 * @property {OwnedVehicleRecord[]} vehicles
 * @property {BookingAvailabilityRecord} availability
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
    availability: {
      generatedAt: '2026-04-19T03:00:00.000Z',
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      minBookableDate: '2026-04-20',
      maxBookableDate: '2026-10-16',
      days: [
        {
          scheduledDate: '2026-04-20',
          status: 'bookable',
          isBookable: true,
          activeSlotCount: 1,
          availableSlotCount: 1,
          totalCapacity: 4,
          remainingCapacity: 4,
          slots: [
            {
              timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
              label: 'Morning Slot',
              startTime: '09:00',
              endTime: '10:00',
              capacity: 4,
              bookingCount: 0,
              remainingCapacity: 4,
              status: 'available',
              isAvailable: true,
            },
          ],
        },
      ],
    },
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
    availability: createEmptyBookingAvailability(),
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
    availability: {
      generatedAt: '2026-04-19T03:00:00.000Z',
      startDate: '2026-04-20',
      endDate: '2026-05-03',
      minBookableDate: '2026-04-20',
      maxBookableDate: '2026-10-16',
      days: [
        {
          scheduledDate: '2026-04-20',
          status: 'no_active_slots',
          isBookable: false,
          activeSlotCount: 0,
          availableSlotCount: 0,
          totalCapacity: 0,
          remainingCapacity: 0,
          slots: [],
        },
      ],
    },
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

export const getBookingAvailability = async ({
  startDate,
  endDate,
  timeSlotId,
  accessToken,
}) => {
  const normalizedStartDate = normalizeIsoDateOnly(startDate);
  const normalizedEndDate = normalizeIsoDateOnly(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    throw new ApiError('Choose a valid booking availability window before loading appointment dates.', 400, {
      path: '/api/bookings/availability',
      startDate,
      endDate,
    });
  }

  const query = new URLSearchParams({
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  });

  if (String(timeSlotId ?? '').trim()) {
    query.set('timeSlotId', String(timeSlotId).trim());
  }

  return normalizeBookingAvailability(
    await request(`/api/bookings/availability?${query.toString()}`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    {
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      timeSlotId,
    },
  );
};

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
  )
    .map(normalizeVehicleRecord)
    .filter(Boolean);
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

export const loadBookingDiscoverySnapshot = async ({
  userId,
  accessToken,
  availabilityWindow,
}) => {
  const normalizedAvailabilityWindow =
    availabilityWindow?.startDate && availabilityWindow?.endDate
      ? {
          startDate: availabilityWindow.startDate,
          endDate: availabilityWindow.endDate,
          timeSlotId: availabilityWindow.timeSlotId,
        }
      : null;
  const [services, timeSlots, vehicles, availability] = await Promise.all([
    loadDiscoverySection('Booking services', () => listBookingServices()),
    loadDiscoverySection('Booking time slots', () => listBookingTimeSlots()),
    loadDiscoverySection('Eligible vehicles', () =>
      listOwnedVehicles({ userId, accessToken }),
    ),
    loadDiscoverySection('Booking availability', () =>
      getBookingAvailability({
        startDate:
          normalizedAvailabilityWindow?.startDate ??
          toBookingDateString(addDays(new Date(), 1) ?? new Date()),
        endDate:
          normalizedAvailabilityWindow?.endDate ??
          toBookingDateString(addDays(addDays(new Date(), 1) ?? new Date(), 13) ?? new Date()),
        timeSlotId: normalizedAvailabilityWindow?.timeSlotId,
        accessToken,
      }),
    ),
  ]);

  return {
    services,
    timeSlots,
    vehicles,
    availability,
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

export const getBookingReservationPayment = async ({ bookingId, accessToken }) => {
  if (!bookingId) {
    throw new ApiError('Select a booking before loading its reservation payment.', 400, {
      path: '/api/bookings/:id/reservation-payment',
    });
  }

  return request(`/api/bookings/${bookingId}/reservation-payment`, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  });
};

export const retryBookingReservationPayment = async ({ bookingId, accessToken }) => {
  if (!bookingId) {
    throw new ApiError('Select a booking before retrying its reservation payment.', 400, {
      path: '/api/bookings/:id/reservation-payment/retry',
    });
  }

  return request(`/api/bookings/${bookingId}/reservation-payment/retry`, {
    method: 'POST',
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

export const listCustomerServiceHistory = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError(
      'You need an active customer session before service history can load.',
      401,
      {
        path: '/api/job-orders/users/:id/service-history',
      },
    );
  }

  return asArray(
    await request(`/api/job-orders/users/${userId}/service-history`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  );
};
