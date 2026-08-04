import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInsuranceVehicleSearchText,
  filterInsuranceOwnedVehicles,
  normalizeInsuranceOwnedVehicles,
  resolveInsuranceAccountVehicleSnapshot,
  resolveInsuranceVehicleSelection,
} from './insuranceVehicleSelectionModel.mjs';

const ownedVehicles = [
  { id: 'vehicle-1', plateNumber: 'AAA111' },
  { id: 'vehicle-2', plateNumber: 'BBB222' },
  { id: 'vehicle-3', plateNumber: 'CCC333' },
];

test('explicit Insurance route vehicle wins over current and primary selections', () => {
  assert.equal(
    resolveInsuranceVehicleSelection({
      currentVehicleId: 'vehicle-2',
      ownedVehicles,
      primaryVehicleId: 'vehicle-1',
      routeVehicleId: 'vehicle-3',
    })?.id,
    'vehicle-3',
  );
});

test('current Insurance vehicle survives refresh when it remains owned', () => {
  assert.equal(
    resolveInsuranceVehicleSelection({
      currentVehicleId: 'vehicle-2',
      ownedVehicles,
      primaryVehicleId: 'vehicle-1',
    })?.id,
    'vehicle-2',
  );
});

test('Insurance vehicle selection falls back through primary, first, and empty states', () => {
  assert.equal(
    resolveInsuranceVehicleSelection({
      currentVehicleId: 'removed-vehicle',
      ownedVehicles,
      primaryVehicleId: 'vehicle-3',
    })?.id,
    'vehicle-3',
  );
  assert.equal(
    resolveInsuranceVehicleSelection({
      ownedVehicles,
      primaryVehicleId: 'removed-vehicle',
    })?.id,
    'vehicle-1',
  );
  assert.equal(
    resolveInsuranceVehicleSelection({
      ownedVehicles: [],
    }),
    null,
  );
});

test('Insurance vehicle normalization drops malformed records', () => {
  assert.deepEqual(
    normalizeInsuranceOwnedVehicles([
      null,
      { id: '' },
      { id: 'vehicle-1' },
    ]),
    [{ id: 'vehicle-1' }],
  );
});

test('same-user authenticated refresh retains the last verified vehicle snapshot', () => {
  const retainedVehicles = resolveInsuranceAccountVehicleSnapshot({
    currentOwnerKey: 'customer-1',
    currentVehicles: ownedVehicles,
    hasSession: true,
    nextOwnerKey: 'customer-1',
    nextVehicles: [],
  });

  assert.equal(retainedVehicles, ownedVehicles);
});

test('validated incoming vehicle snapshots preserve reference identity', () => {
  const nextVehicles = [{ id: 'vehicle-next', plateNumber: 'NEXT123' }];

  assert.equal(
    resolveInsuranceAccountVehicleSnapshot({
      currentOwnerKey: 'customer-1',
      currentVehicles: ownedVehicles,
      hasSession: true,
      nextOwnerKey: 'customer-1',
      nextVehicles,
    }),
    nextVehicles,
  );
});

test('logout and account switches do not retain another session vehicle snapshot', () => {
  assert.deepEqual(
    resolveInsuranceAccountVehicleSnapshot({
      currentOwnerKey: 'customer-1',
      currentVehicles: ownedVehicles,
      hasSession: false,
      nextOwnerKey: 'customer-1',
      nextVehicles: [],
    }),
    [],
  );
  assert.deepEqual(
    resolveInsuranceAccountVehicleSnapshot({
      currentOwnerKey: 'customer-1',
      currentVehicles: ownedVehicles,
      hasSession: true,
      nextOwnerKey: 'customer-2',
      nextVehicles: [],
    }),
    [],
  );
});

test('Insurance vehicle search matches plate, name, and separate make/year tokens', () => {
  const searchableVehicles = [
    {
      id: 'vehicle-1',
      displayName: '2022 Toyota Vios',
      make: 'Toyota',
      model: 'Vios',
      plateNumber: 'ABC 1234',
      year: 2022,
    },
    {
      id: 'vehicle-2',
      displayName: '2023 Honda City',
      make: 'Honda',
      model: 'City',
      plateNumber: 'XYZ 9876',
      year: 2023,
    },
  ];

  assert.deepEqual(
    filterInsuranceOwnedVehicles(searchableVehicles, 'abc'),
    [searchableVehicles[0]],
  );
  assert.deepEqual(
    filterInsuranceOwnedVehicles(searchableVehicles, 'honda 2023'),
    [searchableVehicles[1]],
  );
  assert.deepEqual(
    filterInsuranceOwnedVehicles(searchableVehicles, '  VIOS  '),
    [searchableVehicles[0]],
  );
});

test('Insurance vehicle search preserves owned order and returns all vehicles for blank input', () => {
  assert.deepEqual(filterInsuranceOwnedVehicles(ownedVehicles, ''), ownedVehicles);
  assert.deepEqual(filterInsuranceOwnedVehicles(ownedVehicles, 'missing'), []);
});

test('Insurance vehicle search text includes the customer-facing reference', () => {
  assert.match(
    buildInsuranceVehicleSearchText({
      id: 'vehicle-1',
      publicReference: 'VEH-2026-001',
    }),
    /veh-2026-001/,
  );
});
