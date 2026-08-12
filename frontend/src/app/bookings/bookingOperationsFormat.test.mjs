import test from 'node:test'
import assert from 'node:assert/strict'

import { isBookingEligibleForIntake } from './bookingOperationsFormat.mjs'

test('intake eligibility is limited to confirmed and in-service bookings', () => {
  assert.equal(isBookingEligibleForIntake({ status: 'confirmed' }), true)
  assert.equal(isBookingEligibleForIntake({ status: 'in_service' }), true)
  assert.equal(isBookingEligibleForIntake({ status: 'rescheduled' }), false)
  assert.equal(isBookingEligibleForIntake({ status: 'pending' }), false)
  assert.equal(isBookingEligibleForIntake(null), false)
})
