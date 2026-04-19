import type { RescheduleBookingRequest, UpdateBookingStatusRequest } from './requests';

export type StaffBookingDecisionAction = 'confirm' | 'decline' | 'reschedule';

export type StaffBookingDecisionState =
  | 'action_ready'
  | 'submitting'
  | 'confirmed'
  | 'declined'
  | 'rescheduled'
  | 'invalid_payload'
  | 'unauthorized'
  | 'forbidden'
  | 'stale_transition'
  | 'slot_conflict'
  | 'not_found'
  | 'submit_failed';

export interface StaffBookingStatusActionRequest {
  bookingId: string;
  action: Extract<StaffBookingDecisionAction, 'confirm' | 'decline'>;
  payload: UpdateBookingStatusRequest;
}

export interface StaffBookingRescheduleActionRequest {
  bookingId: string;
  action: Extract<StaffBookingDecisionAction, 'reschedule'>;
  payload: RescheduleBookingRequest;
}

export type StaffBookingDecisionActionRequest =
  | StaffBookingStatusActionRequest
  | StaffBookingRescheduleActionRequest;

export interface StaffBookingDecisionStateRule {
  state: StaffBookingDecisionState;
  surface: 'staff-admin-web';
  truth: 'synchronous-booking-record' | 'client-guard';
  routeKey: 'updateBookingStatus' | 'rescheduleBooking';
  allowedRoles: Array<'service_adviser' | 'super_admin'>;
  description: string;
}

export const staffBookingDecisionStateRules: StaffBookingDecisionStateRule[] = [
  {
    state: 'action_ready',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'A staff user can submit a valid booking decision action.',
  },
  {
    state: 'submitting',
    surface: 'staff-admin-web',
    truth: 'client-guard',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'A booking decision request is in flight and repeated action should be disabled.',
  },
  {
    state: 'confirmed',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The backend accepted the transition to confirmed.',
  },
  {
    state: 'declined',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The backend accepted the transition to declined.',
  },
  {
    state: 'rescheduled',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'rescheduleBooking',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The backend moved the booking to a new slot and date.',
  },
  {
    state: 'invalid_payload',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The status or reschedule payload failed backend validation.',
  },
  {
    state: 'unauthorized',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The staff session is missing or invalid.',
  },
  {
    state: 'forbidden',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The authenticated role is not allowed to perform booking decision actions.',
  },
  {
    state: 'stale_transition',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The requested status transition is no longer allowed for the current booking state.',
  },
  {
    state: 'slot_conflict',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'rescheduleBooking',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The replacement slot is full or the booking cannot be rescheduled.',
  },
  {
    state: 'not_found',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The target booking or replacement time slot was not found.',
  },
  {
    state: 'submit_failed',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    routeKey: 'updateBookingStatus',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'A non-classified network or API error prevented the action from completing.',
  },
];

