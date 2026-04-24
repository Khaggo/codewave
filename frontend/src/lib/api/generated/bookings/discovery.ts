import type { VehicleResponse } from '../vehicles/responses';
import type {
  BookingAvailabilityDayResponse,
  BookingAvailabilityResponse,
  BookingAvailabilitySlotResponse,
  ServiceResponse,
  TimeSlotResponse,
} from './responses';
import type { BookingAvailabilityQuery } from './requests';

export type BookingDiscoveryVehicleResponse = VehicleResponse;

export interface CustomerBookingDiscoverySnapshotResponse {
  services: ServiceResponse[];
  timeSlots: TimeSlotResponse[];
  vehicles: BookingDiscoveryVehicleResponse[];
  availability: BookingAvailabilityResponse;
}

export type CustomerBookingDiscoveryState =
  | 'ready'
  | 'no_services'
  | 'no_time_slots'
  | 'no_owned_vehicles'
  | 'unavailable_time_slots'
  | 'unauthorized'
  | 'load_failed';

export type CustomerBookingAvailabilityState =
  | 'availability_ready'
  | 'availability_partially_available'
  | 'availability_fully_booked'
  | 'availability_no_active_slots'
  | 'availability_outside_window_only'
  | 'availability_load_failed';

export interface CustomerBookingDiscoveryStateRule {
  state: CustomerBookingDiscoveryState;
  surface: 'customer-mobile';
  truth: 'synchronous-booking-record';
  routeKeys:
    | readonly ['listServices', 'listTimeSlots', 'getBookingAvailability']
    | readonly ['listServices', 'listTimeSlots', 'listOwnedVehicles', 'getBookingAvailability'];
  description: string;
}

export const customerBookingDiscoveryStateRules: CustomerBookingDiscoveryStateRule[] = [
  {
    state: 'ready',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles', 'getBookingAvailability'],
    description: 'At least one active service, active time slot, and owned vehicle can be selected.',
  },
  {
    state: 'no_services',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'getBookingAvailability'],
    description: 'No active booking service is available, so customer booking cannot continue.',
  },
  {
    state: 'no_time_slots',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'getBookingAvailability'],
    description: 'No booking time-slot definitions are available.',
  },
  {
    state: 'no_owned_vehicles',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles', 'getBookingAvailability'],
    description: 'The customer must add or select an owned vehicle before booking.',
  },
  {
    state: 'unavailable_time_slots',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'getBookingAvailability'],
    description: 'Time slots exist but none are currently active for customer selection.',
  },
  {
    state: 'unauthorized',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles', 'getBookingAvailability'],
    description: 'The customer session is missing or invalid when loading owned vehicles.',
  },
  {
    state: 'load_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles', 'getBookingAvailability'],
    description: 'A network or API error prevented discovery data from loading.',
  },
];

export interface CustomerBookingAvailabilityStateRule {
  state: CustomerBookingAvailabilityState;
  surface: 'customer-mobile';
  truth: 'synchronous-booking-record';
  routeKey: 'getBookingAvailability';
  description: string;
}

export interface CustomerBookingAvailabilityWindowQuery extends BookingAvailabilityQuery {}

export interface CustomerBookingAvailabilityWindowSnapshot {
  window: BookingAvailabilityResponse;
  selectedDay?: BookingAvailabilityDayResponse | null;
  selectedSlot?: BookingAvailabilitySlotResponse | null;
}

export const customerBookingAvailabilityStateRules: CustomerBookingAvailabilityStateRule[] = [
  {
    state: 'availability_ready',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description: 'At least one date in the requested window is fully bookable for customer selection.',
  },
  {
    state: 'availability_partially_available',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description:
      'The requested window has limited remaining capacity, so the customer must review day or slot pressure before submitting.',
  },
  {
    state: 'availability_fully_booked',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description: 'Every day in the requested window is currently full for the selected availability query.',
  },
  {
    state: 'availability_no_active_slots',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description: 'No active slot definitions are currently available in the requested window.',
  },
  {
    state: 'availability_outside_window_only',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description: 'The requested range falls outside the currently supported backend booking window.',
  },
  {
    state: 'availability_load_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingAvailability',
    description: 'The customer app could not refresh backend-owned booking-date availability.',
  },
];

export const getCustomerBookingDiscoveryState = (
  snapshot: CustomerBookingDiscoverySnapshotResponse,
): CustomerBookingDiscoveryState => {
  if (!snapshot.services.length) {
    return 'no_services';
  }

  if (!snapshot.timeSlots.length) {
    return 'no_time_slots';
  }

  if (!snapshot.timeSlots.some((timeSlot) => timeSlot.isActive)) {
    return 'unavailable_time_slots';
  }

  if (!snapshot.vehicles.length) {
    return 'no_owned_vehicles';
  }

  return 'ready';
};

export const getCustomerBookingAvailabilityState = (
  availability: BookingAvailabilityResponse,
): CustomerBookingAvailabilityState => {
  if (!availability.days.length) {
    return 'availability_load_failed';
  }

  if (availability.days.some((day) => day.status === 'bookable')) {
    return 'availability_ready';
  }

  if (availability.days.some((day) => day.status === 'limited')) {
    return 'availability_partially_available';
  }

  if (availability.days.some((day) => day.status === 'full')) {
    return 'availability_fully_booked';
  }

  if (availability.days.some((day) => day.status === 'no_active_slots')) {
    return 'availability_no_active_slots';
  }

  return 'availability_outside_window_only';
};
