import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBookingTrackingSteps,
  formatReservationFeeUrgency,
  getBookingReference,
  getBookingServiceHeadline,
  getBookingServiceNames,
  getBookingStatusLabel,
  getBookingVehicleLabel,
  getReservationPaymentStatusLabel,
} from './bookingPresentationModel.mjs'

test('booking presentation exports the customer-facing booking reference contract', () => {
  assert.equal(
    getBookingReference({
      bookingReference: 'BK-20260729-0001',
    }),
    'BK-20260729-0001',
  )
})

test('booking and reservation statuses stay readable for known and future values', () => {
  assert.equal(getBookingStatusLabel('pending_payment'), 'Awaiting reservation payment')
  assert.equal(getBookingStatusLabel('awaiting_parts'), 'Awaiting Parts')
  assert.equal(getBookingStatusLabel(''), 'Booking update pending')
  assert.equal(getReservationPaymentStatusLabel({ status: 'paid' }), 'Paid')
  assert.equal(
    getReservationPaymentStatusLabel({ status: 'unknown' }),
    'Payment status unavailable',
  )
})

test('booking service summaries deduplicate names and stay compact', () => {
  const booking = {
    requestedServices: [
      { service: { name: 'Oil change' } },
      { service: { name: 'Brake inspection' } },
      { service: { name: 'Oil change' } },
    ],
  }

  assert.equal(getBookingServiceNames(booking), 'Oil change, Brake inspection')
  assert.equal(getBookingServiceHeadline(booking), 'Oil change + 1 more')
})

test('missing booking vehicles use customer-safe copy instead of internal ids', () => {
  const internalVehicleId = '9f9ca621-5c13-47b5-8ace-5562772cb3ad'
  const label = getBookingVehicleLabel({ vehicleId: internalVehicleId }, [])

  assert.equal(label, 'Unlisted vehicle')
  assert.equal(label.includes(internalVehicleId), false)
})

test('reservation fee urgency is deterministic across minute, hour, and expired windows', () => {
  const now = Date.parse('2026-07-29T00:00:00.000Z')

  assert.equal(
    formatReservationFeeUrgency('2026-07-29T00:30:00.000Z', now),
    'Complete the reservation fee within 30 minutes to secure your slot.',
  )
  assert.equal(
    formatReservationFeeUrgency('2026-07-29T02:00:00.000Z', now),
    'Complete the reservation fee within 2 hours to secure your slot.',
  )
  assert.match(
    formatReservationFeeUrgency('2026-07-28T23:59:00.000Z', now),
    /window has ended/i,
  )
})

test('booking tracking places the active workshop stage after completed handoffs', () => {
  const steps = buildBookingTrackingSteps({
    status: 'confirmed',
    currentWorkshopStage: 'diagnosis',
    workshopStageHistory: [
      { stage: 'diagnosis', note: 'Electrical diagnosis is underway.' },
    ],
  })

  assert.deepEqual(
    steps.slice(0, 4).map(({ label, state }) => ({ label, state })),
    [
      { label: 'Booking Request', state: 'done' },
      { label: 'Staff Review', state: 'done' },
      { label: 'Received', state: 'done' },
      { label: 'Diagnosis', state: 'current' },
    ],
  )
  assert.equal(steps[3].note, 'Electrical diagnosis is underway.')
})

test('completed bookings ignore stale workshop stage metadata', () => {
  const steps = buildBookingTrackingSteps({
    status: 'completed',
    currentWorkshopStage: 'in_repair',
  })

  assert.deepEqual(
    steps.map(({ label, status, state }) => ({ label, status, state })),
    [
      { label: 'Booking Request', status: 'Submitted', state: 'done' },
      { label: 'Staff Review', status: 'Confirmed', state: 'done' },
      { label: 'Appointment Complete', status: 'Completed', state: 'current' },
    ],
  )
})

test('pending-payment tracking keeps payment before staff review', () => {
  const steps = buildBookingTrackingSteps({ status: 'pending_payment' })

  assert.deepEqual(
    steps.map(({ label, state }) => ({ label, state })),
    [
      { label: 'Booking Request', state: 'done' },
      { label: 'Reservation Payment', state: 'current' },
      { label: 'Staff Review', state: 'upcoming' },
      { label: 'Appointment Outcome', state: 'upcoming' },
    ],
  )
})
