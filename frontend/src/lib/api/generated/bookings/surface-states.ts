import { bookingsRoutes, type BookingStatus } from './requests';

export type BookingClientSurface = 'customer-mobile' | 'staff-admin-web' | 'cross-surface';

export type BookingStateTruth =
  | 'synchronous-booking-record'
  | 'derived-operational-read-model'
  | 'async-notification-side-effect';

export interface BookingRouteSurfaceContract {
  surfaces: readonly BookingClientSurface[];
  truth: BookingStateTruth;
  acceptanceStateFamilies: readonly string[];
}

export interface BookingSurfaceState {
  key: string;
  label: string;
  surface: BookingClientSurface;
  canonicalStatus?: BookingStatus;
  truth: BookingStateTruth;
  routeKeys: Array<keyof typeof bookingsRoutes>;
  visibleTo: string[];
  description: string;
}

export const bookingRouteSurfaceMap = {
  listServices: {
    surfaces: ['customer-mobile'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'empty', 'error'],
  },
  listTimeSlots: {
    surfaces: ['customer-mobile'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'empty', 'unavailable', 'error'],
  },
  getBookingAvailability: {
    surfaces: ['customer-mobile'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'empty', 'unauthorized', 'error'],
  },
  createBooking: {
    surfaces: ['customer-mobile'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'validation-error', 'not-found', 'conflict'],
  },
  getBookingById: {
    surfaces: ['customer-mobile', 'staff-admin-web'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'not-found'],
  },
  updateBookingStatus: {
    surfaces: ['staff-admin-web'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'unauthorized', 'forbidden', 'conflict'],
  },
  rescheduleBooking: {
    surfaces: ['staff-admin-web'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'unauthorized', 'forbidden', 'conflict'],
  },
  listBookingsByUser: {
    surfaces: ['customer-mobile'],
    truth: 'synchronous-booking-record',
    acceptanceStateFamilies: ['happy', 'empty', 'not-found'],
  },
  getDailySchedule: {
    surfaces: ['staff-admin-web'],
    truth: 'derived-operational-read-model',
    acceptanceStateFamilies: ['happy', 'empty', 'unauthorized', 'forbidden'],
  },
  getQueueCurrent: {
    surfaces: ['staff-admin-web'],
    truth: 'derived-operational-read-model',
    acceptanceStateFamilies: ['happy', 'empty', 'unauthorized', 'forbidden'],
  },
} as const satisfies Record<keyof typeof bookingsRoutes, BookingRouteSurfaceContract>;

export const bookingCrossSurfaceStateGlossary: BookingSurfaceState[] = [
  {
    key: 'customer_booking_discovery_ready',
    label: 'Customer booking discovery ready',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'getBookingAvailability'],
    visibleTo: ['customer'],
    description: 'Customer can choose active services and available time slots before creating a booking.',
  },
  {
    key: 'customer_booking_availability_window',
    label: 'Customer booking availability window',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['getBookingAvailability'],
    visibleTo: ['customer'],
    description:
      'Customer sees backend-owned bookable, limited, full, and out-of-window day states before choosing an appointment date.',
  },
  {
    key: 'customer_booking_pending',
    label: 'Customer booking pending',
    surface: 'customer-mobile',
    canonicalStatus: 'pending',
    truth: 'synchronous-booking-record',
    routeKeys: ['createBooking', 'getBookingById', 'listBookingsByUser'],
    visibleTo: ['customer'],
    description: 'Booking exists and is waiting for staff decision or operational follow-up.',
  },
  {
    key: 'customer_booking_confirmed',
    label: 'Customer booking confirmed',
    surface: 'customer-mobile',
    canonicalStatus: 'confirmed',
    truth: 'synchronous-booking-record',
    routeKeys: ['getBookingById', 'listBookingsByUser'],
    visibleTo: ['customer'],
    description: 'Staff accepted the booking and the customer can treat the appointment as scheduled.',
  },
  {
    key: 'customer_booking_declined',
    label: 'Customer booking declined',
    surface: 'customer-mobile',
    canonicalStatus: 'declined',
    truth: 'synchronous-booking-record',
    routeKeys: ['getBookingById', 'listBookingsByUser'],
    visibleTo: ['customer'],
    description: 'Staff declined the requested booking and the customer must choose another path.',
  },
  {
    key: 'customer_booking_rescheduled',
    label: 'Customer booking rescheduled',
    surface: 'customer-mobile',
    canonicalStatus: 'rescheduled',
    truth: 'synchronous-booking-record',
    routeKeys: ['getBookingById', 'listBookingsByUser'],
    visibleTo: ['customer'],
    description: 'The booking moved to another date or time slot after staff action.',
  },
  {
    key: 'staff_schedule_visibility',
    label: 'Staff schedule visibility',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKeys: ['getDailySchedule'],
    visibleTo: ['service_adviser', 'super_admin'],
    description: 'Staff can see the day grouped by slot for operational planning.',
  },
  {
    key: 'staff_queue_visibility',
    label: 'Staff queue visibility',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKeys: ['getQueueCurrent'],
    visibleTo: ['service_adviser', 'super_admin'],
    description: 'Staff can see the current queue derived from confirmed and rescheduled bookings.',
  },
  {
    key: 'staff_booking_decision_required',
    label: 'Staff booking decision required',
    surface: 'staff-admin-web',
    canonicalStatus: 'pending',
    truth: 'synchronous-booking-record',
    routeKeys: ['updateBookingStatus', 'rescheduleBooking'],
    visibleTo: ['service_adviser', 'super_admin'],
    description: 'Staff can confirm, decline, or reschedule a booking according to backend transitions.',
  },
  {
    key: 'booking_reminder_pending',
    label: 'Booking reminder pending',
    surface: 'cross-surface',
    truth: 'async-notification-side-effect',
    routeKeys: ['getBookingById', 'getDailySchedule'],
    visibleTo: ['customer', 'service_adviser', 'super_admin'],
    description: 'Reminder work may be queued from booking state, but notifications do not own booking truth.',
  },
];
