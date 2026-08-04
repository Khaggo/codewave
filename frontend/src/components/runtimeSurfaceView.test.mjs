import test from 'node:test'
import assert from 'node:assert/strict'

import { getStaffRedirectLinks } from './runtimeSurfaceView.mjs'

test('getStaffRedirectLinks returns the expected legacy redirect cards', () => {
  assert.deepEqual(getStaffRedirectLinks('unknown'), [])
  assert.deepEqual(
    getStaffRedirectLinks('timeline').map((item) => item.href),
    ['/admin/job-orders', '/admin/qa-audit', '/admin/invoices'],
  )
})
