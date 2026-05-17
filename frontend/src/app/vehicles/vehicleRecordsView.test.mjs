import test from 'node:test'
import assert from 'node:assert/strict'

import { filterVehicles, summarizeVehicles } from './vehicleRecordsView.mjs'

const sampleVehicles = [
  {
    id: 'vehicle-1',
    plate: 'ABC1234',
    owner: 'Marco Dela Cruz',
    ownerEmail: 'marco@example.com',
    model: 'Toyota Hilux',
    color: 'Silver',
    status: 'active',
  },
  {
    id: 'vehicle-2',
    plate: 'XYZ4567',
    owner: 'Ava Santos',
    ownerEmail: 'ava@example.com',
    model: 'Honda City',
    color: 'Black',
    status: 'inactive',
  },
]

test('filterVehicles matches search terms across owner and vehicle fields', () => {
  const result = filterVehicles(sampleVehicles, { query: 'hilux', statusFilter: 'all' })
  assert.deepEqual(result.map((vehicle) => vehicle.id), ['vehicle-1'])
})

test('filterVehicles applies the status filter', () => {
  const result = filterVehicles(sampleVehicles, { query: '', statusFilter: 'inactive' })
  assert.deepEqual(result.map((vehicle) => vehicle.id), ['vehicle-2'])
})

test('summarizeVehicles returns active and inactive totals', () => {
  assert.deepEqual(summarizeVehicles(sampleVehicles), {
    total: 2,
    activeCount: 1,
    inactiveCount: 1,
  })
})
