import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getVehicleDisplayLabel,
  getVehicleFullLabel,
  getVehiclePlateLabel,
} from './vehicleDisplay.mjs'

test('vehicle display labels stay bounded while full identity remains accessible', () => {
  const vehicle = {
    year: 2024,
    make: 'Toyota',
    model: 'Very Long Model Name For Readability QA',
    plateNumber: 'QA-1234',
  }

  assert.equal(getVehicleDisplayLabel(vehicle, 24), '2024 Toyota Very Long…')
  assert.equal(getVehiclePlateLabel(vehicle), 'QA-1234')
  assert.equal(
    getVehicleFullLabel(vehicle),
    '2024 Toyota Very Long Model Name For Readability QA • QA-1234',
  )
})

test('vehicle display labels fall back safely for partial records', () => {
  assert.equal(getVehicleDisplayLabel({ displayName: 'Saved vehicle' }), 'Saved vehicle')
  assert.equal(getVehicleFullLabel({ plateNumber: 'abc-1' }), 'ABC-1')
})
