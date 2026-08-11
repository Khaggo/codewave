import test from 'node:test'
import assert from 'node:assert/strict'

import { isPublicPaymentReturnRoute } from './publicPaymentRouteAccess.mjs'

test('only the four payment return routes are public', () => {
  for (const pathname of [
    '/payments/success',
    '/payments/cancel',
    '/accessories/payment/success',
    '/accessories/payment/cancel',
  ]) {
    assert.equal(isPublicPaymentReturnRoute(pathname), true, pathname)
  }

  for (const pathname of [
    '/',
    '/login',
    '/bookings',
    '/admin/accessories/orders',
    '/payments',
    '/payments/success/details',
    '/accessories/payment/success/extra',
    '/accessories/payment/cancelled',
  ]) {
    assert.equal(isPublicPaymentReturnRoute(pathname), false, pathname)
  }
})
