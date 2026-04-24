export const BOOKINGS_CLOCK = 'BOOKINGS_CLOCK';

export interface BookingsClock {
  now(): Date;
}

export const BOOKING_MIN_LEAD_DAYS = 1;
export const BOOKING_MAX_HORIZON_DAYS = 180;
export const BOOKING_MAX_QUERY_WINDOW_DAYS = 62;

export const BOOKING_ACTIVE_CAPACITY_STATUSES = ['pending', 'confirmed', 'rescheduled'] as const;

export const bookingAvailabilityDayStatusValues = [
  'bookable',
  'limited',
  'full',
  'outside_window',
  'no_active_slots',
] as const;

export const bookingAvailabilitySlotStatusValues = ['available', 'full'] as const;
