import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MOBILE_SESSION_STORAGE_KEY,
  parseMobileSessionSnapshot,
  serializeMobileSessionSnapshot,
} from '../lib/mobileSessionStorage.mjs'
import {
  getBookingReference,
  getBookingRequestedServiceNames,
  getSelectedBookingServices,
  toggleBookingServiceId,
} from './dashboard/bookingSelectionModel.mjs'
import {
  GARAGE_PAGE_SIZE,
  getGaragePageCount,
  getGaragePageModel,
} from './garagePaginationModel.mjs'

test('booking selection supports multiple active services and stable deselection', () => {
  const services = [
    { id: 'oil-change', name: 'Oil change', isActive: true },
    { id: 'alignment', name: 'Wheel alignment', isActive: true },
    { id: 'retired', name: 'Retired service', isActive: false },
  ]

  const firstSelection = toggleBookingServiceId([], 'oil-change')
  const secondSelection = toggleBookingServiceId(firstSelection, 'alignment')
  const withInactiveSelection = toggleBookingServiceId(secondSelection, 'retired')

  assert.deepEqual(secondSelection, ['oil-change', 'alignment'])
  assert.deepEqual(
    getSelectedBookingServices(services, withInactiveSelection).map(
      (service) => service.id,
    ),
    ['oil-change', 'alignment'],
  )
  assert.deepEqual(toggleBookingServiceId(secondSelection, 'oil-change'), [
    'alignment',
  ])
  assert.deepEqual(toggleBookingServiceId(secondSelection, ''), secondSelection)
  assert.notStrictEqual(toggleBookingServiceId(secondSelection, ''), secondSelection)
})

test('booking presentation deduplicates service names and never derives references from UUID slices', () => {
  assert.deepEqual(
    getBookingRequestedServiceNames({
      requestedServices: [
        { service: { name: 'Oil change' } },
        { service: { name: 'Wheel alignment' } },
        { service: { name: 'Oil change' } },
        { service: null },
      ],
    }),
    ['Oil change', 'Wheel alignment'],
  )
  assert.equal(
    getBookingReference({
      bookingReference: 'BK-20260729-0042',
      id: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
    }),
    'BK-20260729-0042',
  )
  assert.equal(
    getBookingReference({
      scheduledDate: '2026-07-29',
      plateNumber: 'ABC 1234',
      id: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
    }),
    'BK-20260729-ABC1234',
  )
})

test('mobile session snapshots round-trip and empty or corrupt state is discarded', () => {
  const snapshot = {
    activeAccount: {
      userId: 'customer-1',
      role: 'customer',
      accessToken: 'access-token',
    },
    registeredAccount: null,
    pendingAccount: null,
    pendingOnboardingCompletion: null,
  }
  const serialized = serializeMobileSessionSnapshot(snapshot)

  assert.equal(MOBILE_SESSION_STORAGE_KEY, '@autocare/mobile-session-v1')
  assert.deepEqual(parseMobileSessionSnapshot(serialized), snapshot)
  assert.equal(
    serializeMobileSessionSnapshot({
      activeAccount: null,
      registeredAccount: null,
    }),
    null,
  )
  assert.equal(parseMobileSessionSnapshot('{invalid json'), null)
  assert.equal(parseMobileSessionSnapshot('null'), null)
})

test('garage pagination stays bounded and clamps after vehicle counts change', () => {
  const vehicles = Array.from({ length: 8 }, (_, index) => ({
    id: `vehicle-${index + 1}`,
  }))

  const middlePage = getGaragePageModel({ vehicles, page: 1 })
  const finalPage = getGaragePageModel({ vehicles, page: 99 })
  const emptyPage = getGaragePageModel({ vehicles: [], page: 3 })

  assert.equal(GARAGE_PAGE_SIZE, 3)
  assert.equal(getGaragePageCount(vehicles.length), 3)
  assert.deepEqual(
    middlePage.visibleVehicles.map((vehicle) => vehicle.id),
    ['vehicle-4', 'vehicle-5', 'vehicle-6'],
  )
  assert.deepEqual(
    {
      first: middlePage.firstVisibleNumber,
      last: middlePage.lastVisibleNumber,
      previous: middlePage.canGoPrevious,
      next: middlePage.canGoNext,
    },
    {
      first: 4,
      last: 6,
      previous: true,
      next: true,
    },
  )
  assert.equal(finalPage.currentPage, 2)
  assert.deepEqual(
    finalPage.visibleVehicles.map((vehicle) => vehicle.id),
    ['vehicle-7', 'vehicle-8'],
  )
  assert.equal(finalPage.canGoNext, false)
  assert.equal(emptyPage.currentPage, 0)
  assert.equal(emptyPage.firstVisibleNumber, 0)
  assert.deepEqual(emptyPage.visibleVehicles, [])
})

test('garage pagination mounts only one small page for large vehicle accounts', () => {
  const vehicles = Array.from({ length: 132 }, (_, index) => ({
    id: `vehicle-${index + 1}`,
  }))
  const page = getGaragePageModel({ vehicles, page: 0 })

  assert.equal(page.totalPages, 44)
  assert.equal(page.totalVehicles, 132)
  assert.equal(page.visibleVehicles.length, GARAGE_PAGE_SIZE)
  assert.deepEqual(
    page.visibleVehicles.map((vehicle) => vehicle.id),
    ['vehicle-1', 'vehicle-2', 'vehicle-3'],
  )
})
