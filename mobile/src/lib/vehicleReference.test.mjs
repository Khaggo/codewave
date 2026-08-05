import assert from 'node:assert/strict'
import test from 'node:test'

import {
  REFERENCE_UNAVAILABLE,
  getCustomerVehicleReference,
} from './vehicleReference.mjs'

test('uses the persisted public vehicle reference', () => {
  assert.equal(
    getCustomerVehicleReference({ publicReference: 'VEH-2026-000123' }),
    'VEH-2026-000123',
  )
})

test('does not derive a reference from plate, model, or an internal id', () => {
  assert.equal(
    getCustomerVehicleReference({
      id: '8b5c6f6a-4d4b-4f17-a1f9-123456789abc',
      plateNumber: 'ABC1234',
      make: 'Toyota',
      model: 'Vios',
    }),
    REFERENCE_UNAVAILABLE,
  )
})
