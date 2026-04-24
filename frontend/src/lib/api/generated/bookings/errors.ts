import type { ApiErrorResponse } from '../shared';

export const bookingsErrorCases: Record<string, ApiErrorResponse[]> = {
  getBookingAvailability: [
    {
      statusCode: 400,
      code: 'INVALID_AVAILABILITY_QUERY',
      message: 'The requested availability window is invalid or too large.',
      source: 'swagger',
    },
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only customers, service advisers, or super admins can read booking availability.',
      source: 'swagger',
    },
  ],
  createBooking: [
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted booking payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 404,
      code: 'RELATED_RECORD_NOT_FOUND',
      message: 'The user, owned vehicle, time slot, or service was not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'BOOKING_CONFLICT',
      message: 'The selected slot is unavailable or another booking conflict exists.',
      source: 'swagger',
    },
  ],
  updateBookingStatus: [
    {
      statusCode: 400,
      code: 'INVALID_STATUS_PAYLOAD',
      message: 'The status payload is invalid or unchanged.',
      source: 'swagger',
    },
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can manage booking state.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'INVALID_STATUS_TRANSITION',
      message: 'The requested status transition is not allowed.',
      source: 'swagger',
    },
  ],
  rescheduleBooking: [
    {
      statusCode: 400,
      code: 'INVALID_RESCHEDULE_PAYLOAD',
      message: 'The reschedule payload is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can reschedule bookings.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'RESCHEDULE_CONFLICT',
      message: 'The booking cannot be rescheduled or the slot is full.',
      source: 'swagger',
    },
  ],
  getDailySchedule: [
    {
      statusCode: 400,
      code: 'INVALID_SCHEDULE_QUERY',
      message: 'The schedule query is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can read the schedule view.',
      source: 'swagger',
    },
  ],
  getQueueCurrent: [
    {
      statusCode: 400,
      code: 'INVALID_QUEUE_QUERY',
      message: 'The queue query is invalid.',
      source: 'swagger',
    },
    {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid access token.',
      source: 'swagger',
    },
    {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only service advisers or super admins can read queue visibility.',
      source: 'swagger',
    },
  ],
};
