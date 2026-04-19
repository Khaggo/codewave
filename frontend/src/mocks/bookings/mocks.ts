import type {
  CustomerBookingCreateSubmission,
} from '../../lib/api/generated/bookings/customer-flow';
import {
  customerBookingCreateStateRules,
  customerBookingReadStateRules,
  getCustomerBookingHistoryState,
} from '../../lib/api/generated/bookings/customer-flow';
import type {
  BookingDiscoveryVehicleResponse,
  CustomerBookingDiscoverySnapshotResponse,
} from '../../lib/api/generated/bookings/discovery';
import {
  customerBookingDiscoveryStateRules,
  getCustomerBookingDiscoveryState,
} from '../../lib/api/generated/bookings/discovery';
import type {
  BookingDiscoverySnapshotResponse,
  BookingResponse,
  DailyScheduleResponse,
  QueueCurrentResponse,
  ServiceResponse,
  TimeSlotResponse,
} from '../../lib/api/generated/bookings/responses';
import {
  bookingCrossSurfaceStateGlossary,
  type BookingSurfaceState,
} from '../../lib/api/generated/bookings/surface-states';
import {
  getStaffBookingQueueState,
  getStaffBookingScheduleState,
  staffBookingQueueStateRules,
  staffBookingScheduleStateRules,
  type StaffBookingScheduleQueueFilters,
} from '../../lib/api/generated/bookings/staff-flow';
import {
  staffBookingDecisionStateRules,
  type StaffBookingDecisionActionRequest,
} from '../../lib/api/generated/bookings/staff-actions';
import {
  bookingContractDriftChecklist,
  bookingCrossSurfaceAcceptanceChecklist,
  bookingReminderExpectation,
  bookingStatusSyncMatrix,
  getBookingStatusSyncRow,
} from '../../lib/api/generated/bookings/status-sync';
import type { ApiErrorResponse } from '../../lib/api/generated/shared';

export const bookingsServicesMock: ServiceResponse[] = [
  {
    id: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
    categoryId: 'd248f7e9-3efc-4ab4-a880-676c8041a25f',
    name: 'Oil Change',
    description: 'Replace engine oil and inspect basic consumables.',
    durationMinutes: 45,
    isActive: true,
    createdAt: '2026-03-25T15:00:00.000Z',
    updatedAt: '2026-03-25T15:00:00.000Z',
  },
];

export const bookingsTimeSlotsMock: TimeSlotResponse[] = [
  {
    id: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
    label: 'Morning Slot',
    startTime: '09:00',
    endTime: '10:00',
    capacity: 4,
    isActive: true,
    createdAt: '2026-03-25T15:00:00.000Z',
    updatedAt: '2026-03-25T15:00:00.000Z',
  },
];

export const bookingsOwnedVehiclesMock: BookingDiscoveryVehicleResponse[] = [
  {
    id: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
    userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
    plateNumber: 'ABC-1234',
    make: 'Toyota',
    model: 'Vios',
    year: 2024,
    color: 'Silver',
    vin: null,
    notes: null,
    createdAt: '2026-03-25T15:00:00.000Z',
    updatedAt: '2026-03-25T15:00:00.000Z',
  },
];

export const bookingsDiscoveryHappyMock: BookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: bookingsTimeSlotsMock,
};

export const bookingsDiscoveryEmptyMock: BookingDiscoverySnapshotResponse = {
  services: [],
  timeSlots: bookingsTimeSlotsMock,
};

export const bookingsDiscoveryUnavailableMock: BookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: bookingsTimeSlotsMock.map((timeSlot) => ({
    ...timeSlot,
    isActive: false,
  })),
};

export const customerBookingDiscoveryHappyMock: CustomerBookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: bookingsTimeSlotsMock,
  vehicles: bookingsOwnedVehiclesMock,
};

export const customerBookingDiscoveryNoServicesMock: CustomerBookingDiscoverySnapshotResponse = {
  services: [],
  timeSlots: bookingsTimeSlotsMock,
  vehicles: bookingsOwnedVehiclesMock,
};

export const customerBookingDiscoveryNoTimeSlotsMock: CustomerBookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: [],
  vehicles: bookingsOwnedVehiclesMock,
};

export const customerBookingDiscoveryUnavailableSlotsMock: CustomerBookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: bookingsTimeSlotsMock.map((timeSlot) => ({
    ...timeSlot,
    isActive: false,
  })),
  vehicles: bookingsOwnedVehiclesMock,
};

export const customerBookingDiscoveryNoOwnedVehiclesMock: CustomerBookingDiscoverySnapshotResponse = {
  services: bookingsServicesMock,
  timeSlots: bookingsTimeSlotsMock,
  vehicles: [],
};

export const customerBookingDiscoveryStateRuleMocks = customerBookingDiscoveryStateRules;

export const customerBookingDiscoveryResolvedStateMocks = {
  happy: getCustomerBookingDiscoveryState(customerBookingDiscoveryHappyMock),
  noServices: getCustomerBookingDiscoveryState(customerBookingDiscoveryNoServicesMock),
  noTimeSlots: getCustomerBookingDiscoveryState(customerBookingDiscoveryNoTimeSlotsMock),
  unavailableSlots: getCustomerBookingDiscoveryState(customerBookingDiscoveryUnavailableSlotsMock),
  noOwnedVehicles: getCustomerBookingDiscoveryState(customerBookingDiscoveryNoOwnedVehiclesMock),
} as const;

export const bookingDetailMock: BookingResponse = {
  id: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  vehicleId: '7e5d3bc0-8e87-4a42-b6d5-59ae8d0eeb6d',
  timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
  scheduledDate: '2026-04-20',
  status: 'pending',
  notes: 'Please double-check the front brakes during the visit.',
  createdAt: '2026-03-25T15:00:00.000Z',
  updatedAt: '2026-03-25T15:00:00.000Z',
  timeSlot: bookingsTimeSlotsMock[0],
  requestedServices: [
    {
      id: 'f4dbeafc-d39f-4ec0-8fd8-f91bc253c808',
      bookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
      serviceId: '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0',
      service: bookingsServicesMock[0],
      createdAt: '2026-03-25T15:00:00.000Z',
    },
  ],
  statusHistory: [
    {
      id: '9759fe0a-f2db-4728-99c0-fd4b1e170733',
      bookingId: 'b520dba5-5bfb-4d34-a931-70bd811f7725',
      previousStatus: null,
      nextStatus: 'pending',
      reason: 'Initial booking request.',
      changedByUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
      changedAt: '2026-03-25T15:00:00.000Z',
    },
  ],
};

export const bookingCreateSuccessMock: BookingResponse = bookingDetailMock;

export const bookingPendingFollowUpMock: BookingResponse = {
  ...bookingDetailMock,
  id: 'a0c6817e-73ed-4cc5-85c1-6a362ef07911',
  timeSlotId: bookingsTimeSlotsMock[0].id,
  scheduledDate: '2026-04-22',
  status: 'pending',
  notes: 'Customer asked staff to confirm tire availability before arrival.',
  createdAt: '2026-03-26T08:30:00.000Z',
  updatedAt: '2026-03-26T08:30:00.000Z',
  requestedServices: bookingDetailMock.requestedServices?.map((requestedService) => ({
    ...requestedService,
    id: '620032fc-e7b8-4141-922f-ff4c438e1c90',
    bookingId: 'a0c6817e-73ed-4cc5-85c1-6a362ef07911',
  })),
  statusHistory: [
    {
      id: '9cc34e03-a6cf-4d2f-86ff-6d54815ce30d',
      bookingId: 'a0c6817e-73ed-4cc5-85c1-6a362ef07911',
      previousStatus: null,
      nextStatus: 'pending',
      reason: 'Booking created',
      changedByUserId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
      changedAt: '2026-03-26T08:30:00.000Z',
    },
  ],
};

export const bookingConfirmedArrivalMock: BookingResponse = {
  ...bookingDetailMock,
  id: '4adbbd71-4b19-4ad7-8554-ea639fc0cb84',
  status: 'confirmed',
  notes: 'Confirmed by staff after checking bay capacity.',
  createdAt: '2026-03-25T16:15:00.000Z',
  updatedAt: '2026-03-25T16:40:00.000Z',
  requestedServices: bookingDetailMock.requestedServices?.map((requestedService) => ({
    ...requestedService,
    id: 'c9e25a1a-c899-421e-8b1d-8a43a2a4cf18',
    bookingId: '4adbbd71-4b19-4ad7-8554-ea639fc0cb84',
  })),
  statusHistory: [
    {
      id: '63e6ff2c-ecf1-49f4-9244-264b67efafdb',
      bookingId: '4adbbd71-4b19-4ad7-8554-ea639fc0cb84',
      previousStatus: null,
      nextStatus: 'pending',
      reason: 'Initial booking request.',
      changedByUserId: bookingDetailMock.userId,
      changedAt: '2026-03-25T16:15:00.000Z',
    },
    {
      id: 'd3f130c7-cbb1-4b9a-a579-e51e83ec09ef',
      bookingId: '4adbbd71-4b19-4ad7-8554-ea639fc0cb84',
      previousStatus: 'pending',
      nextStatus: 'confirmed',
      reason: 'Staff confirmed the requested time slot.',
      changedByUserId: 'bbf9e9d4-f3d6-47a1-a83c-3e85f85d3d5a',
      changedAt: '2026-03-25T16:40:00.000Z',
    },
  ],
};

export const bookingRescheduledArrivalMock: BookingResponse = {
  ...bookingConfirmedArrivalMock,
  id: '0f4a95bc-a8f7-4c34-9416-47a13fd42e5b',
  status: 'rescheduled',
  notes: 'Customer moved from the afternoon slot after staff follow-up.',
  createdAt: '2026-03-25T17:05:00.000Z',
  updatedAt: '2026-03-26T09:05:00.000Z',
  requestedServices: bookingConfirmedArrivalMock.requestedServices?.map((requestedService) => ({
    ...requestedService,
    id: '70b6b339-45d0-4702-9b3e-04e0ca56ff2e',
    bookingId: '0f4a95bc-a8f7-4c34-9416-47a13fd42e5b',
  })),
  statusHistory: [
    ...(bookingConfirmedArrivalMock.statusHistory ?? []).map((historyItem) => ({
      ...historyItem,
      bookingId: '0f4a95bc-a8f7-4c34-9416-47a13fd42e5b',
    })),
    {
      id: 'f59698f3-1657-46cd-b45b-e34cd47090ad',
      bookingId: '0f4a95bc-a8f7-4c34-9416-47a13fd42e5b',
      previousStatus: 'confirmed',
      nextStatus: 'rescheduled',
      reason: 'Staff moved the booking after customer approval.',
      changedByUserId: 'bbf9e9d4-f3d6-47a1-a83c-3e85f85d3d5a',
      changedAt: '2026-03-26T09:05:00.000Z',
    },
  ],
};

export const bookingDeclinedMock: BookingResponse = {
  ...bookingDetailMock,
  id: 'e7f487ab-21fa-4496-9a8b-579f27820b4f',
  status: 'declined',
  notes: 'Declined after staff reviewed bay capacity.',
  updatedAt: '2026-03-26T10:30:00.000Z',
  requestedServices: bookingDetailMock.requestedServices?.map((requestedService) => ({
    ...requestedService,
    id: '1da917f7-4c3b-4e59-89e5-776c197e4d51',
    bookingId: 'e7f487ab-21fa-4496-9a8b-579f27820b4f',
  })),
  statusHistory: [
    ...(bookingDetailMock.statusHistory ?? []).map((historyItem) => ({
      ...historyItem,
      bookingId: 'e7f487ab-21fa-4496-9a8b-579f27820b4f',
    })),
    {
      id: '0f958bde-c422-43d9-b728-19a55c027a42',
      bookingId: 'e7f487ab-21fa-4496-9a8b-579f27820b4f',
      previousStatus: 'pending',
      nextStatus: 'declined',
      reason: 'No available bay for the requested appointment window.',
      changedByUserId: 'bbf9e9d4-f3d6-47a1-a83c-3e85f85d3d5a',
      changedAt: '2026-03-26T10:30:00.000Z',
    },
  ],
};

export const staffBookingConfirmActionMock: StaffBookingDecisionActionRequest = {
  bookingId: bookingDetailMock.id,
  action: 'confirm',
  payload: {
    status: 'confirmed',
    reason: 'Approved after confirming bay capacity.',
  },
};

export const staffBookingDeclineActionMock: StaffBookingDecisionActionRequest = {
  bookingId: bookingDetailMock.id,
  action: 'decline',
  payload: {
    status: 'declined',
    reason: 'Requested slot is not available for the selected service.',
  },
};

export const staffBookingRescheduleActionMock: StaffBookingDecisionActionRequest = {
  bookingId: bookingDetailMock.id,
  action: 'reschedule',
  payload: {
    timeSlotId: bookingsTimeSlotsMock[0].id,
    scheduledDate: '2026-04-22',
    reason: 'Customer approved the alternate slot.',
  },
};

export const staffBookingDecisionStateRuleMocks = staffBookingDecisionStateRules;

export const staffBookingDecisionSuccessMocks = {
  confirmed: bookingConfirmedArrivalMock,
  declined: bookingDeclinedMock,
  rescheduled: bookingRescheduledArrivalMock,
} as const;

export const bookingsUserHistoryMock: BookingResponse[] = [
  bookingPendingFollowUpMock,
  bookingDetailMock,
];

export const bookingsUserHistoryEmptyMock: BookingResponse[] = [];

export const customerBookingCreateSubmissionMock: CustomerBookingCreateSubmission = {
  request: {
    userId: bookingDetailMock.userId,
    vehicleId: bookingDetailMock.vehicleId,
    timeSlotId: bookingDetailMock.timeSlotId,
    scheduledDate: bookingDetailMock.scheduledDate,
    serviceIds: bookingDetailMock.requestedServices?.map((service) => service.serviceId) ?? [],
    notes: bookingDetailMock.notes ?? undefined,
  },
  duplicateSubmitPolicy: 'disable-submit-while-request-pending',
  expectedSuccessState: 'created_pending',
};

export const customerBookingCreateStateRuleMocks = customerBookingCreateStateRules;

export const customerBookingReadStateRuleMocks = customerBookingReadStateRules;

export const customerBookingHistoryStateMocks = {
  loaded: getCustomerBookingHistoryState(bookingsUserHistoryMock),
  empty: getCustomerBookingHistoryState(bookingsUserHistoryEmptyMock),
} as const;

export const bookingsDailyScheduleMock: DailyScheduleResponse = {
  scheduledDate: '2026-04-20',
  slots: [
    {
      timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
      label: 'Morning Slot',
      totalCapacity: 4,
      confirmedCount: 1,
      pendingCount: 1,
      rescheduledCount: 0,
      bookings: [bookingDetailMock, bookingConfirmedArrivalMock],
    },
  ],
};

export const bookingsDailyScheduleEmptyMock: DailyScheduleResponse = {
  scheduledDate: '2026-04-21',
  slots: [
    {
      timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
      label: 'Morning Slot',
      totalCapacity: 4,
      confirmedCount: 0,
      pendingCount: 0,
      rescheduledCount: 0,
      bookings: [],
    },
  ],
};

export const bookingsDailyScheduleHighPressureMock: DailyScheduleResponse = {
  scheduledDate: '2026-04-20',
  slots: [
    {
      timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
      label: 'Morning Slot',
      totalCapacity: 2,
      confirmedCount: 1,
      pendingCount: 1,
      rescheduledCount: 1,
      bookings: [bookingConfirmedArrivalMock, bookingDetailMock, bookingRescheduledArrivalMock],
    },
  ],
};

export const bookingsQueueCurrentMock: QueueCurrentResponse = {
  generatedAt: '2026-04-20T08:45:00.000Z',
  scheduledDate: '2026-04-20',
  currentCount: 1,
  items: [
    {
      queuePosition: 1,
      bookingId: bookingConfirmedArrivalMock.id,
      userId: bookingConfirmedArrivalMock.userId,
      vehicleId: bookingConfirmedArrivalMock.vehicleId,
      timeSlotId: bookingConfirmedArrivalMock.timeSlotId,
      timeSlotLabel: bookingsTimeSlotsMock[0].label,
      scheduledDate: bookingConfirmedArrivalMock.scheduledDate,
      status: 'confirmed',
    },
  ],
};

export const bookingsQueueEmptyMock: QueueCurrentResponse = {
  generatedAt: '2026-04-21T08:45:00.000Z',
  scheduledDate: '2026-04-21',
  currentCount: 0,
  items: [],
};

export const bookingsQueueHighPressureMock: QueueCurrentResponse = {
  generatedAt: '2026-04-20T08:45:00.000Z',
  scheduledDate: '2026-04-20',
  currentCount: 2,
  items: [
    {
      queuePosition: 1,
      bookingId: bookingConfirmedArrivalMock.id,
      userId: bookingConfirmedArrivalMock.userId,
      vehicleId: bookingConfirmedArrivalMock.vehicleId,
      timeSlotId: bookingConfirmedArrivalMock.timeSlotId,
      timeSlotLabel: bookingsTimeSlotsMock[0].label,
      scheduledDate: bookingConfirmedArrivalMock.scheduledDate,
      status: 'confirmed',
    },
    {
      queuePosition: 2,
      bookingId: bookingRescheduledArrivalMock.id,
      userId: bookingRescheduledArrivalMock.userId,
      vehicleId: bookingRescheduledArrivalMock.vehicleId,
      timeSlotId: bookingRescheduledArrivalMock.timeSlotId,
      timeSlotLabel: bookingsTimeSlotsMock[0].label,
      scheduledDate: bookingRescheduledArrivalMock.scheduledDate,
      status: 'rescheduled',
    },
  ],
};

export const staffBookingScheduleQueueFiltersMock: StaffBookingScheduleQueueFilters = {
  schedule: {
    scheduledDate: '2026-04-20',
    status: 'confirmed',
  },
  queue: {
    scheduledDate: '2026-04-20',
  },
};

export const staffBookingScheduleStateRuleMocks = staffBookingScheduleStateRules;

export const staffBookingQueueStateRuleMocks = staffBookingQueueStateRules;

export const staffBookingScheduleResolvedStateMocks = {
  normal: getStaffBookingScheduleState(bookingsDailyScheduleMock),
  empty: getStaffBookingScheduleState(bookingsDailyScheduleEmptyMock),
  highPressure: getStaffBookingScheduleState(bookingsDailyScheduleHighPressureMock),
} as const;

export const staffBookingQueueResolvedStateMocks = {
  normal: getStaffBookingQueueState(bookingsQueueCurrentMock),
  empty: getStaffBookingQueueState(bookingsQueueEmptyMock),
  highPressure: getStaffBookingQueueState(bookingsQueueHighPressureMock),
} as const;

export const bookingsValidationErrorMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'The submitted booking payload is invalid.',
  source: 'swagger',
  details: {
    field: 'scheduledDate',
    reason: 'must be a valid ISO date string',
  },
};

export const bookingsDiscoveryUnauthorizedMock: ApiErrorResponse = {
  statusCode: 401,
  code: 'UNAUTHORIZED',
  message: 'Missing or invalid access token.',
  source: 'swagger',
};

export const bookingsStaffReadUnauthorizedMock: ApiErrorResponse = {
  statusCode: 401,
  code: 'UNAUTHORIZED',
  message: 'Missing or invalid access token.',
  source: 'swagger',
};

export const bookingsStaffReadForbiddenMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can read booking schedule and queue visibility.',
  source: 'swagger',
};

export const bookingsStaffInvalidFilterMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'INVALID_BOOKING_OPERATIONS_FILTER',
  message: 'The selected schedule or queue filter is invalid.',
  source: 'swagger',
};

export const bookingCreateConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'BOOKING_CONFLICT',
  message: 'The selected slot is unavailable or another booking conflict exists.',
  source: 'swagger',
};

export const bookingCreateInvalidVehicleErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'RELATED_RECORD_NOT_FOUND',
  message: 'The user, owned vehicle, time slot, or service was not found.',
  source: 'swagger',
};

export const bookingCreateUnauthorizedSessionMock: ApiErrorResponse = {
  statusCode: 401,
  code: 'UNAUTHORIZED_SESSION',
  message: 'You need an active customer session before creating a booking.',
  source: 'task',
};

export const bookingDuplicateSubmitBlockedMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'DUPLICATE_SUBMIT_BLOCKED',
  message: 'A booking request is already being submitted.',
  source: 'task',
};

export const bookingDetailNotFoundErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'BOOKING_NOT_FOUND',
  message: 'Booking not found.',
  source: 'swagger',
};

export const staffBookingStaleTransitionErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'INVALID_STATUS_TRANSITION',
  message: 'The requested status transition is not allowed.',
  source: 'swagger',
};

export const staffBookingRescheduleConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'RESCHEDULE_CONFLICT',
  message: 'The booking cannot be rescheduled or the slot is full.',
  source: 'swagger',
};

export const staffBookingDecisionForbiddenMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Only service advisers or super admins can manage booking state.',
  source: 'swagger',
};

export const bookingsCrossSurfaceStateGlossaryMock: BookingSurfaceState[] = [
  ...bookingCrossSurfaceStateGlossary,
];

export const bookingsCrossSurfaceAcceptanceStateMocks = {
  customerMobile: [
    'service list loaded',
    'no services available',
    'time slots unavailable',
    'booking created as pending',
    'booking confirmed by staff',
    'booking declined by staff',
    'booking rescheduled by staff',
    'booking create conflict',
  ],
  staffAdminWeb: [
    'daily schedule loaded',
    'daily schedule empty',
    'queue loaded',
    'queue empty',
    'booking decision required',
    'status update forbidden',
    'reschedule conflict',
  ],
  crossSurface: [
    'customer and staff see the same canonical booking status',
    'reminder state is async side effect only',
  ],
} as const;

export const bookingStatusSyncMatrixMock = bookingStatusSyncMatrix;

export const bookingReminderExpectationMock = bookingReminderExpectation;

export const bookingContractDriftChecklistMock = bookingContractDriftChecklist;

export const bookingCrossSurfaceAcceptanceChecklistMock = bookingCrossSurfaceAcceptanceChecklist;

export const bookingStatusSyncResolvedMocks = {
  pending: getBookingStatusSyncRow('pending'),
  confirmed: getBookingStatusSyncRow('confirmed'),
  declined: getBookingStatusSyncRow('declined'),
  rescheduled: getBookingStatusSyncRow('rescheduled'),
  completed: getBookingStatusSyncRow('completed'),
  cancelled: getBookingStatusSyncRow('cancelled'),
} as const;
