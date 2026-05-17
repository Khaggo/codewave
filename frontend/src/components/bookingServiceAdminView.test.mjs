import test from 'node:test'
import assert from 'node:assert/strict'

import { groupBookingServices } from './bookingServiceAdminView.mjs'

test('groupBookingServices groups by category label and uncategorized fallback', () => {
  const categories = [
    { id: 'cat-maintenance', name: 'Maintenance' },
    { id: 'cat-detailing', name: 'Detailing' },
  ]

  const services = [
    { id: 'svc-2', name: 'Wash', categoryId: 'cat-detailing' },
    { id: 'svc-1', name: 'Oil Change', categoryId: 'cat-maintenance' },
    { id: 'svc-3', name: 'Alignment', categoryId: '' },
  ]

  assert.deepEqual(groupBookingServices(categories, services), [
    {
      key: 'cat-detailing',
      label: 'Detailing',
      services: [{ id: 'svc-2', name: 'Wash', categoryId: 'cat-detailing' }],
    },
    {
      key: 'cat-maintenance',
      label: 'Maintenance',
      services: [{ id: 'svc-1', name: 'Oil Change', categoryId: 'cat-maintenance' }],
    },
    {
      key: 'uncategorized',
      label: 'Uncategorized',
      services: [{ id: 'svc-3', name: 'Alignment', categoryId: '' }],
    },
  ])
})
