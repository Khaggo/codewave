import type { DailyScheduleQuery, QueueCurrentQuery } from './requests';
import type { DailyScheduleResponse, QueueCurrentResponse } from './responses';

export type StaffBookingOperationsRole = 'service_adviser' | 'super_admin';

export type StaffBookingScheduleState =
  | 'schedule_loaded'
  | 'schedule_empty'
  | 'schedule_high_pressure'
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_filter'
  | 'load_failed';

export type StaffBookingQueueState =
  | 'queue_loaded'
  | 'queue_empty'
  | 'queue_high_pressure'
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_filter'
  | 'load_failed';

export interface StaffBookingScheduleQueueFilters {
  schedule: DailyScheduleQuery;
  queue: QueueCurrentQuery;
}

export interface StaffBookingScheduleStateRule {
  state: StaffBookingScheduleState;
  surface: 'staff-admin-web';
  truth: 'derived-operational-read-model';
  routeKey: 'getDailySchedule';
  allowedRoles: StaffBookingOperationsRole[];
  description: string;
}

export interface StaffBookingQueueStateRule {
  state: StaffBookingQueueState;
  surface: 'staff-admin-web';
  truth: 'derived-operational-read-model';
  routeKey: 'getQueueCurrent';
  allowedRoles: StaffBookingOperationsRole[];
  description: string;
}

export const staffBookingScheduleStateRules: StaffBookingScheduleStateRule[] = [
  {
    state: 'schedule_loaded',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The schedule read model returned one or more bookings for the selected filters.',
  },
  {
    state: 'schedule_empty',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The schedule read model returned slots but no bookings for the selected filters.',
  },
  {
    state: 'schedule_high_pressure',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'At least one slot has active bookings at or above slot capacity.',
  },
  {
    state: 'unauthorized',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The staff session is missing or expired.',
  },
  {
    state: 'forbidden',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The authenticated user is not allowed to read booking schedule visibility.',
  },
  {
    state: 'invalid_filter',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The schedule query filter is invalid.',
  },
  {
    state: 'load_failed',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getDailySchedule',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'A non-classified network or API failure prevented the schedule from loading.',
  },
];

export const staffBookingQueueStateRules: StaffBookingQueueStateRule[] = [
  {
    state: 'queue_loaded',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The queue read model returned one or more active queue items.',
  },
  {
    state: 'queue_empty',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The queue read model returned no active queue items.',
  },
  {
    state: 'queue_high_pressure',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The queue has enough active items to warrant staff attention.',
  },
  {
    state: 'unauthorized',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The staff session is missing or expired.',
  },
  {
    state: 'forbidden',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The authenticated user is not allowed to read booking queue visibility.',
  },
  {
    state: 'invalid_filter',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'The queue query filter is invalid.',
  },
  {
    state: 'load_failed',
    surface: 'staff-admin-web',
    truth: 'derived-operational-read-model',
    routeKey: 'getQueueCurrent',
    allowedRoles: ['service_adviser', 'super_admin'],
    description: 'A non-classified network or API failure prevented the queue from loading.',
  },
];

export const getStaffBookingScheduleState = (
  schedule: DailyScheduleResponse,
): Extract<StaffBookingScheduleState, 'schedule_loaded' | 'schedule_empty' | 'schedule_high_pressure'> => {
  const slots = schedule.slots ?? [];
  const hasBookings = slots.some((slot) => (slot.bookings ?? []).length > 0);
  const hasHighPressureSlot = slots.some((slot) => {
    const activeCount = (slot.confirmedCount ?? 0) + (slot.pendingCount ?? 0) + (slot.rescheduledCount ?? 0);
    return (slot.totalCapacity ?? 0) > 0 && activeCount >= (slot.totalCapacity ?? 0);
  });

  if (hasHighPressureSlot) {
    return 'schedule_high_pressure';
  }

  return hasBookings ? 'schedule_loaded' : 'schedule_empty';
};

export const getStaffBookingQueueState = (
  queue: QueueCurrentResponse,
): Extract<StaffBookingQueueState, 'queue_loaded' | 'queue_empty' | 'queue_high_pressure'> => {
  if ((queue.currentCount ?? 0) <= 0) {
    return 'queue_empty';
  }

  return (queue.currentCount ?? 0) >= 2 ? 'queue_high_pressure' : 'queue_loaded';
};

