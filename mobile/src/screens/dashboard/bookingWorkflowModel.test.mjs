import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialBookingAvailabilityState,
  createInitialBookingDraft,
  getBookingSubmissionErrorState,
  getBookingSubmissionSuccessState,
  normalizeBookingDraft,
  resolveBookingSubmission,
} from './bookingWorkflowModel.mjs';

const discovery = {
  status: 'ready',
  services: [
    { id: 'service-active', name: 'Oil Change', isActive: true },
    { id: 'service-inactive', name: 'Archived Service', isActive: false },
  ],
  timeSlots: [
    { id: 'slot-am', label: 'Morning', isActive: true, isBookable: true },
  ],
  vehicles: [{ id: 'vehicle-1', make: 'Toyota', model: 'Vios' }],
  availability: {
    ...createInitialBookingAvailabilityState(),
    status: 'ready',
    vehicleId: 'vehicle-1',
    minBookableDate: '2026-08-01',
    maxBookableDate: '2026-08-31',
    days: [
      {
        scheduledDate: '2026-08-02',
        isBookable: true,
        slots: [{ timeSlotId: 'slot-am', isAvailable: true }],
      },
    ],
  },
  errorMessage: '',
};

test('booking draft normalization removes stale choices and selects live defaults', () => {
  const normalized = normalizeBookingDraft({
    draft: {
      ...createInitialBookingDraft(),
      serviceIds: ['service-active', 'service-inactive', 'missing-service'],
      timeKey: 'missing-slot',
      vehicleId: 'missing-vehicle',
      servicePage: 9,
    },
    discovery,
    servicePageSize: 1,
  });

  assert.deepEqual(normalized.serviceIds, ['service-active']);
  assert.equal(normalized.timeKey, 'slot-am');
  assert.equal(normalized.vehicleId, 'vehicle-1');
  assert.equal(normalized.dateKey, '2026-08-02');
  assert.equal(normalized.servicePage, 1);
});

test('booking draft normalization preserves a Garage handoff while discovery loads', () => {
  const pendingDraft = {
    ...createInitialBookingDraft(),
    serviceIds: ['service-from-garage'],
    timeKey: 'slot-from-garage',
    vehicleId: 'vehicle-from-garage',
    servicePage: 3,
  };

  const normalized = normalizeBookingDraft({
    draft: pendingDraft,
    discovery: {
      status: 'loading',
      services: [],
      timeSlots: [],
      vehicles: [],
      availability: createInitialBookingAvailabilityState(),
    },
    servicePageSize: 6,
  });

  assert.equal(normalized.vehicleId, 'vehicle-from-garage');
  assert.deepEqual(normalized.serviceIds, ['service-from-garage']);
  assert.equal(normalized.timeKey, 'slot-from-garage');
  assert.equal(normalized.servicePage, 3);
});

test('booking submission requires an authenticated customer', () => {
  const result = resolveBookingSubmission({
    account: null,
    discovery,
    draft: {
      ...createInitialBookingDraft(),
      serviceIds: ['service-active'],
      timeKey: 'slot-am',
      vehicleId: 'vehicle-1',
      dateKey: '2026-08-02',
    },
  });

  assert.equal(result.valid, false);
  assert.equal(result.state.status, 'unauthorized');
});

test('booking submission uses only live selected records and trims notes', () => {
  const result = resolveBookingSubmission({
    account: { userId: 'customer-1' },
    discovery,
    draft: {
      ...createInitialBookingDraft(),
      serviceIds: ['service-active'],
      timeKey: 'slot-am',
      vehicleId: 'vehicle-1',
      dateKey: '2026-08-02',
      notes: '  Please inspect the brakes.  ',
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.selectedVehicle.id, 'vehicle-1');
  assert.deepEqual(
    result.selectedServices.map((service) => service.id),
    ['service-active'],
  );
  assert.equal(result.selectedTimeSlot.id, 'slot-am');
  assert.equal(result.scheduledDate, '2026-08-02');
  assert.equal(result.notes, 'Please inspect the brakes.');
});

test('booking submission rejects a slot that authoritative availability blocks', () => {
  const result = resolveBookingSubmission({
    account: { userId: 'customer-1' },
    discovery: {
      ...discovery,
      availability: {
        ...discovery.availability,
        days: [
          {
            scheduledDate: '2026-08-02',
            isBookable: true,
            slots: [{ timeSlotId: 'slot-am', isAvailable: false }],
          },
        ],
      },
    },
    draft: {
      ...createInitialBookingDraft(),
      serviceIds: ['service-active'],
      timeKey: 'slot-am',
      vehicleId: 'vehicle-1',
      dateKey: '2026-08-02',
    },
  });

  assert.equal(result.valid, false);
  assert.equal(result.state.status, 'validation-error');
});

test('booking conflict and success copy preserve the existing customer workflow', () => {
  assert.deepEqual(
    getBookingSubmissionErrorState({
      statusCode: 409,
      fallbackMessage: 'Conflict',
    }),
    {
      status: 'conflict',
      message:
        'That slot is no longer available or another booking conflict exists. Refreshing live availability now.',
      booking: null,
    },
  );
  assert.match(
    getBookingSubmissionSuccessState({ status: 'pending_payment' }).message,
    /reservation fee/i,
  );
});
