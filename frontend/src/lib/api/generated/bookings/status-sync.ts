import type { NotificationTriggerName } from '../notifications/triggers';

import type { BookingStatus } from './requests';

export type BookingSyncTruth =
  | 'synchronous-booking-record'
  | 'derived-operational-read-model'
  | 'async-notification-side-effect';

export interface BookingStatusSyncRow {
  status: BookingStatus;
  customerMobileLabel: string;
  staffWebLabel: string;
  customerCanSee: boolean;
  staffCanAct: boolean;
  truth: BookingSyncTruth;
  reminderExpectation: 'may_schedule_reminder' | 'no_reminder_expected';
  notes: string;
}

export interface BookingReminderExpectation {
  triggerName: Extract<NotificationTriggerName, 'booking.reminder_requested'>;
  sourceDomain: 'main-service.bookings';
  truth: 'async-notification-side-effect';
  appliesToStatuses: BookingStatus[];
  customerVisible: true;
  transportPolicy: 'email-only-notification-domain-owned';
  notes: string;
}

export interface BookingContractDriftCheck {
  check: string;
  expected: string;
  owner: 'booking-domain' | 'swagger' | 'frontend-contract' | 'notification-domain';
}

export interface BookingCrossSurfaceAcceptanceCheck {
  check: string;
  surface: 'customer-mobile' | 'staff-admin-web' | 'cross-surface';
  truth: BookingSyncTruth;
  required: true;
}

export const bookingStatusSyncMatrix: BookingStatusSyncRow[] = [
  {
    status: 'pending',
    customerMobileLabel: 'Pending staff review',
    staffWebLabel: 'Decision required',
    customerCanSee: true,
    staffCanAct: true,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'no_reminder_expected',
    notes: 'Pending bookings are visible but should not imply staff confirmation.',
  },
  {
    status: 'confirmed',
    customerMobileLabel: 'Confirmed appointment',
    staffWebLabel: 'Confirmed arrival',
    customerCanSee: true,
    staffCanAct: true,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'may_schedule_reminder',
    notes: 'Confirmed bookings may feed email reminders through notifications.',
  },
  {
    status: 'declined',
    customerMobileLabel: 'Declined by staff',
    staffWebLabel: 'Declined',
    customerCanSee: true,
    staffCanAct: false,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'no_reminder_expected',
    notes: 'Declined bookings should not remain in the active queue.',
  },
  {
    status: 'rescheduled',
    customerMobileLabel: 'Rescheduled appointment',
    staffWebLabel: 'Rescheduled',
    customerCanSee: true,
    staffCanAct: true,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'may_schedule_reminder',
    notes: 'Rescheduled bookings may feed reminder updates for the replacement date and slot.',
  },
  {
    status: 'completed',
    customerMobileLabel: 'Completed visit',
    staffWebLabel: 'Completed',
    customerCanSee: true,
    staffCanAct: false,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'no_reminder_expected',
    notes: 'Completed booking is historical and should not create new booking reminders.',
  },
  {
    status: 'cancelled',
    customerMobileLabel: 'Cancelled',
    staffWebLabel: 'Cancelled',
    customerCanSee: true,
    staffCanAct: false,
    truth: 'synchronous-booking-record',
    reminderExpectation: 'no_reminder_expected',
    notes: 'Cancelled booking should not remain in active customer or staff queues.',
  },
];

export const bookingReminderExpectation: BookingReminderExpectation = {
  triggerName: 'booking.reminder_requested',
  sourceDomain: 'main-service.bookings',
  truth: 'async-notification-side-effect',
  appliesToStatuses: ['confirmed', 'rescheduled'],
  customerVisible: true,
  transportPolicy: 'email-only-notification-domain-owned',
  notes: 'Booking may request a reminder, but delivery, retry, dedupe, and copy stay owned by notifications.',
};

export const bookingContractDriftChecklist: BookingContractDriftCheck[] = [
  {
    check: 'All booking routes are labeled live or planned.',
    expected: 'T501-T506 routes stay live and match Swagger/controller paths.',
    owner: 'swagger',
  },
  {
    check: 'Customer mobile and staff web use one canonical BookingStatus union.',
    expected: 'No client-only booking status names replace backend status values.',
    owner: 'frontend-contract',
  },
  {
    check: 'Schedule and queue remain derived reads.',
    expected: 'Derived read models never replace booking record truth.',
    owner: 'booking-domain',
  },
  {
    check: 'Reminder expectations stay notification-owned.',
    expected: 'Booking tasks do not define email templates, retries, or delivery state.',
    owner: 'notification-domain',
  },
];

export const bookingCrossSurfaceAcceptanceChecklist: BookingCrossSurfaceAcceptanceCheck[] = [
  {
    check: 'Customer can discover services, slots, and owned vehicles before create.',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    required: true,
  },
  {
    check: 'Customer can create a booking and see it as pending.',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    required: true,
  },
  {
    check: 'Customer history and detail read canonical booking status.',
    surface: 'customer-mobile',
    truth: 'synchronous-booking-record',
    required: true,
  },
  {
    check: 'Staff can read daily schedule and current queue as derived views.',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    required: true,
  },
  {
    check: 'Staff can confirm, decline, and reschedule through backend transitions.',
    surface: 'staff-admin-web',
    truth: 'synchronous-booking-record',
    required: true,
  },
  {
    check: 'Reminder expectations are modeled only as async side effects.',
    surface: 'cross-surface',
    truth: 'async-notification-side-effect',
    required: true,
  },
];

export const getBookingStatusSyncRow = (status: BookingStatus) =>
  bookingStatusSyncMatrix.find((row) => row.status === status);

