import assert from 'node:assert/strict'
import test from 'node:test'

import { getServerGaragePageModel } from './garagePaginationModel.mjs'

test('server Garage page model preserves bounded rows and authoritative totals', () => {
  const vehicles = [
    { id: 'vehicle-4' },
    { id: 'vehicle-5' },
    { id: 'vehicle-6' },
  ]
  const page = getServerGaragePageModel({
    vehicles,
    page: {
      currentPage: 1,
      limit: 3,
      total: 8,
      hasNext: true,
    },
  })

  assert.equal(page.visibleVehicles, vehicles)
  assert.equal(page.firstVisibleNumber, 4)
  assert.equal(page.lastVisibleNumber, 6)
  assert.equal(page.totalVehicles, 8)
  assert.equal(page.totalPages, 3)
  assert.equal(page.canGoPrevious, true)
  assert.equal(page.canGoNext, true)
})

test('server Garage page model keeps empty pages stable', () => {
  const page = getServerGaragePageModel()

  assert.deepEqual(page.visibleVehicles, [])
  assert.equal(page.firstVisibleNumber, 0)
  assert.equal(page.lastVisibleNumber, 0)
  assert.equal(page.totalPages, 1)
  assert.equal(page.canGoPrevious, false)
  assert.equal(page.canGoNext, false)
})
