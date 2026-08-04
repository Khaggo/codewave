import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildBookingVehiclePickerPage,
  getBookingVehiclePageForSelection,
} from './bookingVehiclePickerModel.mjs'

const vehicles = Array.from({ length: 12 }, (_, index) => ({
  id: `vehicle-${index + 1}`,
  title: `${2020 + (index % 5)} Toyota Vehicle ${index + 1}`,
  subtitle: `Toyota Model ${index + 1}`,
  plateNumber: `QA${String(index + 1).padStart(4, '0')}`,
}))

test('booking vehicle picker keeps large vehicle lists bounded', () => {
  const firstPage = buildBookingVehiclePickerPage({ vehicles })
  const lastPage = buildBookingVehiclePickerPage({ vehicles, page: 2 })

  assert.equal(firstPage.items.length, 5)
  assert.equal(firstPage.firstVisibleNumber, 1)
  assert.equal(firstPage.lastVisibleNumber, 5)
  assert.equal(firstPage.hasNextPage, true)
  assert.equal(lastPage.items.length, 2)
  assert.equal(lastPage.firstVisibleNumber, 11)
  assert.equal(lastPage.lastVisibleNumber, 12)
  assert.equal(lastPage.hasNextPage, false)
})

test('booking vehicle picker searches labels and plates before paging', () => {
  const page = buildBookingVehiclePickerPage({
    vehicles,
    search: 'qa0012',
    page: 4,
  })

  assert.deepEqual(page.items.map((vehicle) => vehicle.id), ['vehicle-12'])
  assert.equal(page.currentPage, 0)
  assert.equal(page.totalMatches, 1)
})

test('booking vehicle picker opens the page containing a selected vehicle', () => {
  assert.equal(getBookingVehiclePageForSelection(vehicles, 'vehicle-11'), 2)
  assert.equal(getBookingVehiclePageForSelection(vehicles, 'missing'), 0)
})
