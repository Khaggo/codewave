import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFallbackGarageState,
  buildGarageFailureState,
  buildLifecycleFailureState,
  buildLifecycleUnavailableState,
  resolveGaragePageNavigation,
  resolveGarageVehicleId,
} from './garageWorkflowModel.mjs';

const vehicles = [
  { id: 'vehicle-1', make: 'Toyota', model: 'Vios', plateNumber: 'ABC1234' },
  { id: 'vehicle-2', make: 'Honda', model: 'City', plateNumber: 'XYZ5678' },
];

test('Garage fallback state and selection preserve an available current vehicle', () => {
  const garage = buildFallbackGarageState({
    vehicles,
    preferredVehicleId: 'vehicle-2',
  });

  assert.equal(garage.primaryVehicleId, 'vehicle-2');
  assert.equal(garage.vehicleCount, 2);
  assert.equal(
    resolveGarageVehicleId({
      garage,
      currentVehicleId: 'vehicle-1',
      preferredVehicleId: 'vehicle-2',
    }),
    'vehicle-1',
  );
});

test('Garage selection falls back to the preferred or authoritative primary vehicle', () => {
  const garage = buildFallbackGarageState({
    vehicles,
    preferredVehicleId: 'vehicle-2',
  });

  assert.equal(
    resolveGarageVehicleId({
      garage,
      currentVehicleId: 'missing',
      preferredVehicleId: 'vehicle-2',
    }),
    'vehicle-2',
  );
  assert.equal(
    resolveGarageVehicleId({
      garage,
      currentVehicleId: 'missing',
      preferredVehicleId: 'also-missing',
    }),
    'vehicle-2',
  );
});

test('Garage failures distinguish access loss from recoverable load failures', () => {
  const fallback = buildFallbackGarageState({ vehicles });

  assert.equal(
    buildGarageFailureState({
      fallback,
      statusCode: 403,
      message: 'Forbidden',
    }).status,
    'garage_forbidden',
  );
  assert.equal(
    buildGarageFailureState({
      fallback,
      statusCode: 500,
      message: 'Unavailable',
    }).status,
    'garage_failed',
  );
});

test('Lifecycle empty and forbidden states remain tied to the requested vehicle context', () => {
  const empty = buildLifecycleUnavailableState({
    hasSession: true,
    vehicleId: null,
  });
  const forbidden = buildLifecycleUnavailableState({
    hasSession: false,
    vehicleId: 'vehicle-1',
  });

  assert.equal(empty.status, 'timeline_empty');
  assert.equal(empty.entityId, null);
  assert.equal(forbidden.status, 'timeline_forbidden');
  assert.equal(forbidden.entityId, 'vehicle-1');
});

test('Lifecycle failures keep the selected entity and customer-safe status', () => {
  const notFound = buildLifecycleFailureState({
    error: { status: 404, message: 'Internal lookup failed' },
    vehicleId: 'vehicle-2',
  });
  const generic = buildLifecycleFailureState({
    error: new Error('Please retry later.'),
    vehicleId: 'vehicle-1',
  });

  assert.equal(notFound.entityId, 'vehicle-2');
  assert.equal(notFound.status, 'timeline_not_found');
  assert.doesNotMatch(notFound.errorMessage, /internal lookup/i);
  assert.equal(generic.entityId, 'vehicle-1');
  assert.equal(generic.errorMessage, 'Please retry later.');
});

test('Garage fallback bounds locally cached vehicles to the requested page', () => {
  const cachedVehicles = Array.from({ length: 8 }, (_, index) => ({
    id: `vehicle-${index + 1}`,
    make: 'Toyota',
    model: `Model ${index + 1}`,
    plateNumber: `GAR${1000 + index}`,
  }));
  const garage = buildFallbackGarageState({
    vehicles: cachedVehicles,
    pageIndex: 1,
    pageSize: 3,
  });

  assert.deepEqual(
    garage.vehicles.map((vehicle) => vehicle.id),
    ['vehicle-4', 'vehicle-5', 'vehicle-6'],
  );
  assert.equal(garage.vehicleCount, 8);
  assert.equal(garage.page.currentPage, 1);
  assert.equal(garage.page.hasNext, true);
  assert.equal(garage.vehicleSummaries[0].ordinalLabel, 'Vehicle 4');
});

test('Garage page navigation blocks rapid taps while loading and uses cursor history', () => {
  const page = {
    currentPage: 1,
    hasNext: true,
    nextCursor: 'cursor-2',
  };

  assert.deepEqual(
    resolveGaragePageNavigation({
      direction: 'next',
      status: 'garage_ready',
      page,
      cursorHistory: [null, 'cursor-1'],
    }),
    {
      pageIndex: 2,
      cursor: 'cursor-2',
    },
  );
  assert.deepEqual(
    resolveGaragePageNavigation({
      direction: 'previous',
      status: 'garage_ready',
      page,
      cursorHistory: [null, 'cursor-1'],
    }),
    {
      pageIndex: 0,
      cursor: null,
    },
  );
  assert.equal(
    resolveGaragePageNavigation({
      direction: 'next',
      status: 'garage_loading',
      page,
      cursorHistory: [null, 'cursor-1'],
    }),
    null,
  );
});
