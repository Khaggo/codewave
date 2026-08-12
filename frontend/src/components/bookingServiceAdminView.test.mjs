import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  createDefaultBookingServiceListQuery,
  getBookingServiceListPresentation,
  getBookingServicePager,
  groupBookingServices,
} from './bookingServiceAdminView.mjs'

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

test('service list presentation distinguishes filtered-empty and resets every filter to page one', () => {
  const filtered = getBookingServiceListPresentation({
    requestStatus: 'success',
    itemCount: 0,
    query: { search: 'brake', status: 'inactive', categoryId: 'category-1', page: 4 },
  })

  assert.equal(filtered.isFilteredEmpty, true)
  assert.equal(filtered.isCatalogEmpty, false)
  assert.deepEqual(createDefaultBookingServiceListQuery(), {
    search: '',
    status: 'all',
    categoryId: '',
    page: 1,
  })
})

test('service list presentation identifies a true catalog-empty response', () => {
  const empty = getBookingServiceListPresentation({
    requestStatus: 'success',
    itemCount: 0,
    query: createDefaultBookingServiceListQuery(),
  })

  assert.equal(empty.hasActiveFilters, false)
  assert.equal(empty.isFilteredEmpty, false)
  assert.equal(empty.isCatalogEmpty, true)
  assert.equal(empty.showStableList, true)
})

test('service list pager keeps a stable one-page footer and enables bounded navigation', () => {
  assert.deepEqual(getBookingServicePager({ page: 1, totalPages: 0, requestStatus: 'success' }), {
    page: 1,
    totalPages: 1,
    previousDisabled: true,
    nextDisabled: true,
  })
  assert.deepEqual(getBookingServicePager({ page: 2, totalPages: 3, requestStatus: 'success' }), {
    page: 2,
    totalPages: 3,
    previousDisabled: false,
    nextDisabled: false,
  })
})

test('service table is constrained to its grid region with fixed columns and safe wrapping', () => {
  const source = readFileSync(new URL('./BookingServiceAdmin.js', import.meta.url), 'utf8')
  assert.match(source, /card min-w-0 overflow-hidden/)
  assert.match(source, /table-surface min-w-0 max-w-full/)
  assert.match(source, /table-scroll min-w-0 max-w-full/)
  assert.match(source, /data-table w-full min-w-\[860px\] table-fixed/)
  assert.match(source, /block break-all text-xs/)
})
