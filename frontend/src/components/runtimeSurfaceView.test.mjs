import test from 'node:test'
import assert from 'node:assert/strict'

import { getRuntimeRecoveryCopy, getStaffRedirectLinks } from './runtimeSurfaceView.mjs'

test('getRuntimeRecoveryCopy explains how to reconnect runtime-backed surfaces', () => {
  assert.match(getRuntimeRecoveryCopy(), /NEXT_PUBLIC_ECOMMERCE_API_BASE_URL/)
  assert.match(getRuntimeRecoveryCopy(), /catalog and inventory/)
})

test('getStaffRedirectLinks returns the expected legacy redirect cards', () => {
  assert.deepEqual(
    getStaffRedirectLinks('shop').map((item) => item.href),
    ['/admin/catalog', '/admin/inventory'],
  )
  assert.deepEqual(
    getStaffRedirectLinks('timeline').map((item) => item.href),
    ['/admin/job-orders', '/admin/qa-audit', '/admin/invoices'],
  )
})
