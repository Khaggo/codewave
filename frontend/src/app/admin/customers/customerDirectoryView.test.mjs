import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAddressLabel,
  buildVehicleLabel,
  filterCustomers,
  summarizeCustomers,
} from './customerDirectoryView.mjs'

const sampleCustomers = [
  {
    id: 'customer-1',
    displayName: 'Marco Dela Cruz',
    email: 'marco@example.com',
    isActive: true,
    profile: { phone: '09171234567' },
    defaultAddress: {
      addressLine1: '12 Mabini Street',
      city: 'Makati',
      province: 'Metro Manila',
    },
    vehicles: [
      {
        id: 'vehicle-1',
        year: '2023',
        make: 'Toyota',
        model: 'Hilux',
        plateNumber: 'ABC1234',
      },
    ],
  },
  {
    id: 'customer-2',
    displayName: 'Ava Santos',
    email: 'ava@example.com',
    isActive: false,
    profile: { phone: '09995557777' },
    defaultAddress: null,
    vehicles: [],
  },
]

test('buildAddressLabel joins the available address parts', () => {
  assert.equal(
    buildAddressLabel({
      addressLine1: '12 Mabini Street',
      addressLine2: 'Unit 8',
      city: 'Makati',
      province: 'Metro Manila',
      postalCode: '1200',
    }),
    '12 Mabini Street, Unit 8, Makati, Metro Manila, 1200',
  )
})

test('buildVehicleLabel prefers year make and model before the plate number fallback', () => {
  assert.equal(
    buildVehicleLabel({
      year: '2021',
      make: 'Honda',
      model: 'Civic',
      plateNumber: 'XYZ9876',
    }),
    '2021 Honda Civic',
  )
  assert.equal(buildVehicleLabel({ plateNumber: 'XYZ9876' }), 'XYZ9876')
})

test('filterCustomers searches across customer and vehicle fields', () => {
  const result = filterCustomers(sampleCustomers, {
    query: 'hilux',
    statusFilter: 'all',
    vehicleFilter: 'all',
  })

  assert.deepEqual(result.map((customer) => customer.id), ['customer-1'])
})

test('filterCustomers supports active and vehicle presence filters together', () => {
  const result = filterCustomers(sampleCustomers, {
    query: '',
    statusFilter: 'inactive',
    vehicleFilter: 'without_vehicles',
  })

  assert.deepEqual(result.map((customer) => customer.id), ['customer-2'])
})

test('summarizeCustomers returns the key customer directory counts', () => {
  assert.deepEqual(summarizeCustomers(sampleCustomers), {
    total: 2,
    activeCount: 1,
    inactiveCount: 1,
    withVehiclesCount: 1,
  })
})
