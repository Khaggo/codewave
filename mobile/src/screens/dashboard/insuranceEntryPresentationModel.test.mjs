import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInsuranceEntryVehicles,
  getInsuranceEntryView,
} from './insuranceEntryPresentationModel.mjs'

test('insurance entry prefers server summaries and drops invalid vehicle records', () => {
  assert.deepEqual(
    buildInsuranceEntryVehicles(
      [
        { id: 'vehicle-1', title: '2020 Toyota Vios', subtitle: 'ABC 1234' },
        { title: 'Missing id' },
      ],
      [{ id: 'fallback-1', make: 'Honda', model: 'City' }],
    ),
    [
      {
        id: 'vehicle-1',
        title: '2020 Toyota Vios',
        subtitle: 'ABC 1234',
        ordinalLabel: 'Vehicle 1',
      },
    ],
  )
})

test('insurance entry builds customer-readable fallback vehicle copy', () => {
  assert.deepEqual(
    buildInsuranceEntryVehicles([], [
      {
        id: 'vehicle-2',
        year: 2019,
        make: 'Toyota',
        model: 'Vios',
        plateNumber: 'XYZ 9876',
        color: 'Silver',
      },
    ])[0],
    {
      id: 'vehicle-2',
      year: 2019,
      make: 'Toyota',
      model: 'Vios',
      plateNumber: 'XYZ 9876',
      color: 'Silver',
      title: '2019 Toyota Vios',
      subtitle: 'XYZ 9876 - Silver',
      ordinalLabel: 'Vehicle 1',
    },
  )
})

test('insurance entry keeps loading, error, empty, and ready states exclusive', () => {
  assert.equal(getInsuranceEntryView({ status: 'garage_loading' }).state, 'loading')
  assert.equal(getInsuranceEntryView({ status: 'garage_failed' }).state, 'error')
  assert.equal(getInsuranceEntryView({ status: 'garage_ready' }).state, 'empty')

  const vehicles = [{ id: 'vehicle-1', title: 'Toyota Vios' }]
  assert.deepEqual(
    getInsuranceEntryView({
      status: 'garage_ready',
      vehicles,
      selectedVehicleId: 'vehicle-1',
    }),
    {
      state: 'ready',
      selectedVehicle: vehicles[0],
      canOpen: true,
    },
  )
  assert.equal(
    getInsuranceEntryView({
      status: 'garage_ready',
      vehicles,
      selectedVehicleId: 'missing',
    }).canOpen,
    false,
  )
})
