import type { CreateBookingRequest } from './requests';
import type { BookingResponse } from './responses';

export type CustomerBookingCreateState =
  | 'draft_ready'
  | 'submitting'
  | 'created_pending'
  | 'validation_error'
  | 'missing_related_record'
  | 'slot_conflict'
  | 'duplicate_submit_blocked'
  | 'unauthorized_session'
  | 'submit_failed';

export type CustomerBookingReadState =
  | 'detail_loaded'
  | 'history_loaded'
  | 'history_empty'
  | 'not_found'
  | 'unauthorized_session'
  | 'load_failed';

export interface CustomerBookingCreateStateRule {
  state: CustomerBookingCreateState;
  surface: 'customer-mobile';
  truth: 'synchronous-booking-record' | 'client-guard';
  routeKey: 'createBooking';
  description: string;
}

export interface CustomerBookingReadStateRule {
  state: CustomerBookingReadState;
  surface: 'customer-mobile';
  truth: 'synchronous-booking-record' | 'client-guard';
  routeKey: 'getBookingById' | 'listBookingsByUser';
  description: string;
}

export interface CustomerBookingCreateSubmission {
  request: CreateBookingRequest;
  duplicateSubmitPolicy: 'disable-submit-while-request-pending';
  expectedSuccessState: Extract<CustomerBookingCreateState, 'created_pending'>;
}

export const customerBookingCreateStateRules: CustomerBookingCreateStateRule[] = [
  {
    state: 'draft_ready',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createBooking',
    description: 'The customer has selected an owned vehicle, service, active slot, and date.',
  },
  {
    state: 'submitting',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createBooking',
    description: 'The first create request is in flight and duplicate submit should be blocked.',
  },
  {
    state: 'created_pending',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'createBooking',
    description: 'The backend created a booking with canonical status pending.',
  },
  {
    state: 'validation_error',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'createBooking',
    description: 'The submitted booking payload is invalid.',
  },
  {
    state: 'missing_related_record',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'createBooking',
    description: 'The user, owned vehicle, time slot, or requested service was not found.',
  },
  {
    state: 'slot_conflict',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'createBooking',
    description: 'The selected slot is unavailable or another booking conflict exists.',
  },
  {
    state: 'duplicate_submit_blocked',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createBooking',
    description: 'The mobile client blocks a second create request while one is already submitting.',
  },
  {
    state: 'unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'createBooking',
    description: 'The mobile session is missing before submission can be attempted.',
  },
  {
    state: 'submit_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'createBooking',
    description: 'A non-classified network or API failure prevented booking creation.',
  },
];

export const customerBookingReadStateRules: CustomerBookingReadStateRule[] = [
  {
    state: 'detail_loaded',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingById',
    description: 'The customer can view the booking detail returned by the backend.',
  },
  {
    state: 'history_loaded',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'listBookingsByUser',
    description: 'The customer booking history contains at least one booking.',
  },
  {
    state: 'history_empty',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'listBookingsByUser',
    description: 'The customer has no booking history yet.',
  },
  {
    state: 'not_found',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingById',
    description: 'The requested booking detail could not be found.',
  },
  {
    state: 'unauthorized_session',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listBookingsByUser',
    description: 'The mobile session is missing before history can be loaded.',
  },
  {
    state: 'load_failed',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    routeKey: 'getBookingById',
    description: 'A non-classified network or API failure prevented booking data from loading.',
  },
];

export const getCustomerBookingHistoryState = (
  bookings: BookingResponse[],
): Extract<CustomerBookingReadState, 'history_loaded' | 'history_empty'> =>
  bookings.length ? 'history_loaded' : 'history_empty';

