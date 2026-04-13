import type {
  BookingResponse,
  DailyScheduleResponse,
  QueueCurrentResponse,
  ServiceResponse,
  TimeSlotResponse,
} from '../../lib/api/generated/bookings/responses';
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

export const bookingsDailyScheduleMock: DailyScheduleResponse = {
  scheduledDate: '2026-04-20',
  slots: [
    {
      timeSlotId: 'e7318032-2fe0-4f40-b3d4-5ba2a8c94320',
      label: 'Morning Slot',
      totalCapacity: 4,
      confirmedCount: 2,
      pendingCount: 1,
      rescheduledCount: 0,
      bookings: [bookingDetailMock],
    },
  ],
};

export const bookingsQueueCurrentMock: QueueCurrentResponse = {
  generatedAt: '2026-04-20T08:45:00.000Z',
  currentCount: 1,
  items: [
    {
      queuePosition: 1,
      bookingId: bookingDetailMock.id,
      userId: bookingDetailMock.userId,
      vehicleId: bookingDetailMock.vehicleId,
      timeSlotId: bookingDetailMock.timeSlotId,
      timeSlotLabel: bookingsTimeSlotsMock[0].label,
      scheduledDate: bookingDetailMock.scheduledDate,
      status: 'confirmed',
    },
  ],
};

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
