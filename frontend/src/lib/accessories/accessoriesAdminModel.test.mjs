import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACCESSORY_CATALOG_DISABLED_CODE,
  ACCESSORIES_NETWORK_UNAVAILABLE_CODE,
  getAccessoryApiErrorCode,
  getAccessoryCatalogViewState,
  getAccessoryOrderNextAction,
  normalizeAccessoryAdminCategories,
  normalizeAccessoryAdminPage,
  normalizeAccessoryStaffOrderDetail,
} from './accessoriesAdminModel.mjs'

test('accessory catalog presentation distinguishes disabled, unauthorized, network, error, and empty states', () => {
  assert.equal(getAccessoryCatalogViewState({ requestStatus: 'error', errorCode: ACCESSORY_CATALOG_DISABLED_CODE, errorStatus: 403 }), 'disabled')
  assert.equal(getAccessoryCatalogViewState({ requestStatus: 'error', errorStatus: 403 }), 'unauthorized')
  assert.equal(getAccessoryCatalogViewState({ requestStatus: 'error', errorCode: ACCESSORIES_NETWORK_UNAVAILABLE_CODE, errorStatus: 0 }), 'network-error')
  assert.equal(getAccessoryCatalogViewState({ requestStatus: 'error', errorStatus: 500 }), 'error')
  assert.equal(getAccessoryCatalogViewState({ requestStatus: 'ready', itemCount: 0 }), 'empty')
  assert.equal(getAccessoryApiErrorCode({ details: { message: { code: ACCESSORY_CATALOG_DISABLED_CODE } } }), ACCESSORY_CATALOG_DISABLED_CODE)
})

test('staff accessory lists render at most one bounded server page', () => {
  const result = normalizeAccessoryAdminPage({
    items: Array.from({ length: 500 }, (_, id) => ({ id })),
    nextCursor: 'v1.next',
  })

  assert.equal(result.items.length, 25)
  assert.equal(result.nextCursor, 'v1.next')
})

test('malformed accessory list payloads become a safe empty page', () => {
  assert.deepEqual(normalizeAccessoryAdminPage(null), { items: [], nextCursor: null })
  assert.deepEqual(normalizeAccessoryAdminPage({ items: 'not-an-array', nextCursor: 42 }), {
    items: [],
    nextCursor: null,
  })
})

test('malformed accessory categories are removed at the staff boundary', () => {
  assert.deepEqual(normalizeAccessoryAdminCategories(null), [])
  assert.deepEqual(
    normalizeAccessoryAdminCategories([
      null,
      { id: 'category-1', name: 'Lights', slug: 'lights' },
      { id: 'category-2', name: '', slug: 'invalid' },
    ]),
    [{ id: 'category-1', name: 'Lights', slug: 'lights' }],
  )
})

test('null and invalid nested rows are rejected at the staff boundary', () => {
  const result = normalizeAccessoryAdminPage(
    { items: [null, { order: null }, { id: 'order-1', orderReference: 'AS-1', version: 1 }] },
    25,
    (order) => Boolean(order?.id && order.orderReference),
  )
  assert.deepEqual(result.items, [{ id: 'order-1', orderReference: 'AS-1', version: 1 }])
  assert.equal(normalizeAccessoryStaffOrderDetail({ order: null }), null)
})

test('terminal and exception orders never expose a Take action', () => {
  const base = { id: 'order-1', orderReference: 'AS-1', version: 1, assignedToUserId: null }
  for (const status of ['cancelled', 'expired', 'collected', 'payment_exception', 'refund_pending', 'refunded']) {
    assert.equal(getAccessoryOrderNextAction({ ...base, status }, 'staff-1'), null, status)
  }
  assert.deepEqual(
    getAccessoryOrderNextAction({ ...base, status: 'reserved' }, 'staff-1'),
    { key: 'take', label: 'Take order' },
  )
})
