import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBookingHistoryListPage } from './bookingHistoryListModel.mjs'

const bookings = Array.from({ length: 23 }, (_, index) => ({
  id: `booking-${index + 1}`,
  bookingReference: `BK-20260729-${String(index + 1).padStart(4, '0')}`,
  status: index === 22 ? 'pending_payment' : 'completed',
  vehicleId: index === 22 ? 'vehicle-special' : 'vehicle-default',
  requestedServices: [
    {
      service: {
        name: index === 22 ? 'Brake inspection' : 'Oil change',
      },
    },
  ],
}))
const vehicles = [
  { id: 'vehicle-default', make: 'Toyota', model: 'Vios', year: 2022 },
  { id: 'vehicle-special', make: 'Honda', model: 'City', year: 2024 },
]

test('booking history list keeps long histories bounded', () => {
  const firstPage = buildBookingHistoryListPage({ bookings, vehicles })
  const lastPage = buildBookingHistoryListPage({ bookings, vehicles, page: 2 })

  assert.equal(firstPage.items.length, 10)
  assert.equal(firstPage.lastVisibleNumber, 10)
  assert.equal(lastPage.items.length, 3)
  assert.equal(lastPage.firstVisibleNumber, 21)
  assert.equal(lastPage.hasNextPage, false)
})

test('booking history search matches references, statuses, services, and vehicles', () => {
  for (const search of ['0023', 'awaiting reservation', 'brake', 'honda city']) {
    const page = buildBookingHistoryListPage({ bookings, vehicles, search })
    assert.deepEqual(page.items.map((booking) => booking.id), ['booking-23'])
  }
})
