import type { ContractRouteStatus, RouteContract } from '../shared';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'rescheduled'
  | 'completed'
  | 'cancelled';

export interface CreateBookingRequest {
  userId: string;
  vehicleId: string;
  timeSlotId: string;
  scheduledDate: string;
  serviceIds: string[];
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: Exclude<BookingStatus, 'rescheduled'>;
  reason?: string;
}

export interface RescheduleBookingRequest {
  timeSlotId: string;
  scheduledDate: string;
  reason?: string;
}

export interface DailyScheduleQuery {
  scheduledDate: string;
  timeSlotId?: string;
  status?: BookingStatus;
}

export interface QueueCurrentQuery {
  scheduledDate?: string;
  timeSlotId?: string;
}

export const bookingsRoutes: Record<string, RouteContract> = {
  listServices: {
    method: 'GET',
    path: '/api/services',
    status: 'live',
    source: 'swagger',
  },
  listTimeSlots: {
    method: 'GET',
    path: '/api/time-slots',
    status: 'live',
    source: 'swagger',
  },
  createBooking: {
    method: 'POST',
    path: '/api/bookings',
    status: 'live',
    source: 'swagger',
  },
  getBookingById: {
    method: 'GET',
    path: '/api/bookings/:id',
    status: 'live',
    source: 'swagger',
  },
  updateBookingStatus: {
    method: 'PATCH',
    path: '/api/bookings/:id/status',
    status: 'live',
    source: 'swagger',
  },
  rescheduleBooking: {
    method: 'POST',
    path: '/api/bookings/:id/reschedule',
    status: 'live',
    source: 'swagger',
  },
  listBookingsByUser: {
    method: 'GET',
    path: '/api/users/:id/bookings',
    status: 'live',
    source: 'swagger',
  },
  getDailySchedule: {
    method: 'GET',
    path: '/api/bookings/daily-schedule',
    status: 'live' satisfies ContractRouteStatus,
    source: 'swagger',
    notes: 'Staff-only daily schedule route.',
  },
  getQueueCurrent: {
    method: 'GET',
    path: '/api/queue/current',
    status: 'live' satisfies ContractRouteStatus,
    source: 'swagger',
    notes: 'Staff-only queue visibility route.',
  },
};
