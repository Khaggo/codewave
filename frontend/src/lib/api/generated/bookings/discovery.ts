import type { ServiceResponse, TimeSlotResponse } from './responses';

export interface BookingDiscoveryVehicleResponse {
  id: string;
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  vin?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBookingDiscoverySnapshotResponse {
  services: ServiceResponse[];
  timeSlots: TimeSlotResponse[];
  vehicles: BookingDiscoveryVehicleResponse[];
}

export type CustomerBookingDiscoveryState =
  | 'ready'
  | 'no_services'
  | 'no_time_slots'
  | 'no_owned_vehicles'
  | 'unavailable_time_slots'
  | 'unauthorized'
  | 'load_failed';

export interface CustomerBookingDiscoveryStateRule {
  state: CustomerBookingDiscoveryState;
  surface: 'customer-mobile';
  truth: 'synchronous-booking-record';
  routeKeys: readonly ['listServices', 'listTimeSlots'] | readonly ['listServices', 'listTimeSlots', 'listOwnedVehicles'];
  description: string;
}

export const customerBookingDiscoveryStateRules: CustomerBookingDiscoveryStateRule[] = [
  {
    state: 'ready',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles'],
    description: 'At least one active service, active time slot, and owned vehicle can be selected.',
  },
  {
    state: 'no_services',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots'],
    description: 'No active booking service is available, so customer booking cannot continue.',
  },
  {
    state: 'no_time_slots',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots'],
    description: 'No booking time-slot definitions are available.',
  },
  {
    state: 'no_owned_vehicles',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles'],
    description: 'The customer must add or select an owned vehicle before booking.',
  },
  {
    state: 'unavailable_time_slots',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots'],
    description: 'Time slots exist but none are currently active for customer selection.',
  },
  {
    state: 'unauthorized',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles'],
    description: 'The customer session is missing or invalid when loading owned vehicles.',
  },
  {
    state: 'load_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKeys: ['listServices', 'listTimeSlots', 'listOwnedVehicles'],
    description: 'A network or API error prevented discovery data from loading.',
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

