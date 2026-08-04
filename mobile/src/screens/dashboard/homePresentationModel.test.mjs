import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFeaturedRewardCopy,
  buildHomeCustomerName,
  buildHomeStatus,
  buildRecentHomeServices,
  getHomeGreeting,
  getHomeServiceHistoryView,
} from './homePresentationModel.mjs'

const booking = {
  status: 'pending',
  scheduledDate: '2026-07-29',
  timeSlotLabel: '9:00 AM',
  requestedServices: [{ name: 'Oil change' }],
  vehicleLabel: 'Toyota Vios',
}

test('home greeting and customer name never invent profile details', () => {
  assert.equal(getHomeGreeting(8), 'Good morning,')
  assert.equal(getHomeGreeting(14), 'Good afternoon,')
  assert.equal(getHomeGreeting(21), 'Good evening,')
  assert.equal(buildHomeCustomerName({ firstName: 'Ana', lastName: 'Reyes' }), 'Ana Reyes')
  assert.equal(buildHomeCustomerName(null), 'Customer')
})

test('home status keeps pending work distinct from terminal booking outcomes', () => {
  const pending = buildHomeStatus({ booking })
  assert.equal(pending.title, 'Wait for staff review')
  assert.equal(pending.action, 'track')

  const cancelled = buildHomeStatus({
    booking: { ...booking, status: 'cancelled' },
  })
  assert.equal(cancelled.title, 'Booking cancelled')
  assert.equal(cancelled.buttonLabel, 'Book Again')
  assert.equal(cancelled.action, 'book')

  const completed = buildHomeStatus({
    booking: { ...booking, status: 'completed' },
  })
  assert.equal(completed.title, 'Service completed')
  assert.equal(completed.progressWidth, '100%')
})

test('home status sends reservation-fee work to tracking', () => {
  const state = buildHomeStatus({
    booking: { ...booking, status: 'pending_payment' },
    reservationPayment: {
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  })

  assert.equal(state.title, 'Complete reservation fee')
  assert.equal(state.buttonLabel, 'Pay Now')
  assert.equal(state.action, 'track')
})

test('recent service and reward presentation remain bounded', () => {
  const services = buildRecentHomeServices([
    { id: '1', completedServiceNames: ['Oil change'], bookingDate: '2026-07-01' },
    { id: '2', completedServiceNames: ['Brake service'], bookingDate: '2026-07-02' },
    { id: '3', completedServiceNames: ['Alignment'], bookingDate: '2026-07-03' },
    { id: '4', completedServiceNames: ['Detailing'], bookingDate: '2026-07-04' },
  ])
  assert.equal(services.length, 3)

  const reward = buildFeaturedRewardCopy({
    available: true,
    title: 'Free wash',
    description: 'Redeem one wash.',
    pointsLabel: '500 points',
  })
  assert.equal(reward.buttonLabel, 'Claim Reward')
})

test('home service history exposes one deterministic render state', () => {
  assert.equal(getHomeServiceHistoryView('loading', 0), 'loading')
  assert.equal(getHomeServiceHistoryView('error', 0), 'error')
  assert.equal(getHomeServiceHistoryView('ready', 2), 'ready')
  assert.equal(getHomeServiceHistoryView('ready', 0), 'empty')
})
