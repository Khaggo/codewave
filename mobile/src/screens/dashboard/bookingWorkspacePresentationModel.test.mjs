import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canSubmitBooking,
  getBookingCreateStatusPresentation,
  getBookingDiscoveryStateKey,
  getBookingHistoryView,
  getBookingSubmitLabel,
  normalizeBookingWorkspaceMode,
} from './bookingWorkspacePresentationModel.mjs'

test('booking mode falls back to the guided booking flow', () => {
  assert.equal(normalizeBookingWorkspaceMode('track'), 'track')
  assert.equal(normalizeBookingWorkspaceMode('future-mode'), 'book')
  assert.equal(normalizeBookingWorkspaceMode(null), 'book')
})

test('booking discovery states remain mutually exclusive', () => {
  assert.equal(getBookingDiscoveryStateKey({ status: 'loading' }), 'loading')
  assert.equal(getBookingDiscoveryStateKey({ status: 'unauthorized' }), 'unauthorized')
  assert.equal(getBookingDiscoveryStateKey({ status: 'error' }), 'error')
  assert.equal(getBookingDiscoveryStateKey({ status: 'ready' }), 'empty-vehicles')
  assert.equal(
    getBookingDiscoveryStateKey({
      status: 'ready',
      vehicles: [{}],
      services: [{ isActive: false }],
      timeSlots: [{ isActive: true }],
    }),
    'empty-services',
  )
  assert.equal(
    getBookingDiscoveryStateKey({
      status: 'ready',
      vehicles: [{}],
      services: [{ isActive: true }],
      timeSlots: [{ isActive: false }],
    }),
    'unavailable-slots',
  )
  assert.equal(
    getBookingDiscoveryStateKey({
      status: 'ready',
      vehicles: [{}],
      services: [{ isActive: true }],
      timeSlots: [{ isActive: true }],
    }),
    'ready',
  )
})

test('booking submission requires every live selection and rejects submitting state', () => {
  const validSelection = {
    discoveryStateKey: 'ready',
    selectedVehicle: { id: 'vehicle-1' },
    selectedServices: [{ id: 'service-1', isActive: true }],
    selectedTimeSlot: { id: 'slot-1', isActive: true },
    selectedDateKey: '2026-08-03',
    selectedSlotAvailability: { isAvailable: true },
    selectedDay: { isBookable: true },
    createStatus: 'idle',
  }

  assert.equal(canSubmitBooking(validSelection), true)
  assert.equal(canSubmitBooking({ ...validSelection, selectedVehicle: null }), false)
  assert.equal(
    canSubmitBooking({
      ...validSelection,
      selectedSlotAvailability: { isAvailable: false },
    }),
    false,
  )
  assert.equal(canSubmitBooking({ ...validSelection, createStatus: 'submitting' }), false)
})

test('booking create feedback and submit copy remain deterministic', () => {
  assert.equal(getBookingCreateStatusPresentation('idle'), null)
  assert.deepEqual(getBookingCreateStatusPresentation('conflict'), {
    icon: 'calendar-alert',
    title: 'Slot conflict',
    isLoading: false,
    actionLabel: 'Refresh Options',
  })
  assert.equal(getBookingCreateStatusPresentation('submitting')?.isLoading, true)
  assert.equal(getBookingCreateStatusPresentation('unauthorized')?.title, 'Sign in again')
  assert.equal(getBookingSubmitLabel('submitting', true), 'Sending...')
  assert.equal(getBookingSubmitLabel('idle', true), 'Book Appointment')
  assert.equal(getBookingSubmitLabel('idle', false), 'Complete all steps to book')
})

test('booking history states preserve loaded rows during refresh', () => {
  assert.equal(getBookingHistoryView({ status: 'loading', bookings: [] }), 'loading')
  assert.equal(
    getBookingHistoryView({ status: 'loading', bookings: [{ id: 'booking-1' }] }),
    'ready',
  )
  assert.equal(getBookingHistoryView({ status: 'unauthorized', bookings: [] }), 'unauthorized')
  assert.equal(getBookingHistoryView({ status: 'error', bookings: [] }), 'error')
  assert.equal(getBookingHistoryView({ status: 'ready', bookings: [] }), 'empty')
})
