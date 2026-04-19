import { ApiError } from './authClient';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const appendQuery = (path, query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

const parseResponse = async (response) => {
  const rawText = await response.text();
  return rawText ? JSON.parse(rawText) : null;
};

const request = async (path, { accessToken, body, method = 'GET', query } = {}) => {
  const response = await fetch(`${API_BASE_URL}${appendQuery(path, query)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
};

export const getDailySchedule = (query, accessToken) =>
  request('/api/bookings/daily-schedule', {
    accessToken,
    query,
  });

export const getCurrentQueue = (query, accessToken) =>
  request('/api/queue/current', {
    accessToken,
    query,
  });

export const getTimeSlotDefinitions = (accessToken) =>
  request('/api/time-slots', {
    accessToken,
  });

export const createTimeSlotDefinition = (payload, accessToken) =>
  request('/api/time-slots', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const updateTimeSlotDefinition = ({ timeSlotId, ...payload }, accessToken) => {
  if (!timeSlotId) {
    throw new ApiError('Select a time slot before updating its definition.', 400, {
      path: '/api/time-slots/:id',
    });
  }

  return request(`/api/time-slots/${timeSlotId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });
};

export const updateBookingStatus = ({ bookingId, status, reason }, accessToken) => {
  if (!bookingId) {
    throw new ApiError('Select a booking before updating its status.', 400, {
      path: '/api/bookings/:id/status',
    });
  }

  return request(`/api/bookings/${bookingId}/status`, {
    method: 'PATCH',
    accessToken,
    body: {
      status,
      reason: reason ? String(reason).trim() : undefined,
    },
  });
};

export const confirmBooking = ({ bookingId, reason }, accessToken) =>
  updateBookingStatus(
    {
      bookingId,
      status: 'confirmed',
      reason: reason ?? 'Confirmed by staff from booking operations.',
    },
    accessToken,
  );

export const declineBooking = ({ bookingId, reason }, accessToken) =>
  updateBookingStatus(
    {
      bookingId,
      status: 'declined',
      reason: reason ?? 'Declined by staff from booking operations.',
    },
    accessToken,
  );

export const rescheduleBooking = ({ bookingId, timeSlotId, scheduledDate, reason }, accessToken) => {
  if (!bookingId) {
    throw new ApiError('Select a booking before rescheduling it.', 400, {
      path: '/api/bookings/:id/reschedule',
    });
  }

  return request(`/api/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    accessToken,
    body: {
      timeSlotId,
      scheduledDate,
      reason: reason ? String(reason).trim() : undefined,
    },
  });
};
