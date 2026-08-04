import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCustomerProfileSummary,
  formatCustomerProfilePhone,
  getLoyaltyProgressWidth,
  getProfileMenuLoyaltyState,
  normalizeProfileMenuScreen,
} from './profileMenuPresentationModel.mjs'

test('profile summary never renders undefined account fragments', () => {
  assert.deepEqual(buildCustomerProfileSummary(), {
    fullName: 'Customer',
    email: 'Email not provided',
    phone: 'Phone not provided',
    initials: 'C',
  })

  assert.deepEqual(
    buildCustomerProfileSummary({
      firstName: '  Jasper ',
      lastName: ' Sanchez ',
      email: ' jasper@example.com ',
      phoneNumber: '09171234567',
    }),
    {
      fullName: 'Jasper Sanchez',
      email: 'jasper@example.com',
      phone: '+63 917-123-4567',
      initials: 'JS',
    },
  )
})

test('profile phone formatting accepts local and Philippine international forms', () => {
  assert.equal(formatCustomerProfilePhone('09171234567'), '+63 917-123-4567')
  assert.equal(formatCustomerProfilePhone('+63 917 123 4567'), '+63 917-123-4567')
  assert.equal(formatCustomerProfilePhone('invalid'), 'Phone not provided')
})

test('loyalty progress remains bounded and does not invent progress at zero', () => {
  assert.equal(getLoyaltyProgressWidth(-1), '0%')
  assert.equal(getLoyaltyProgressWidth(0), '0%')
  assert.equal(getLoyaltyProgressWidth(0.01), '8%')
  assert.equal(getLoyaltyProgressWidth(0.5), '50%')
  assert.equal(getLoyaltyProgressWidth(2), '100%')
  assert.equal(getLoyaltyProgressWidth('not-a-number'), '0%')
})

test('unknown profile screens fall back to the More root', () => {
  assert.equal(normalizeProfileMenuScreen('security'), 'security')
  assert.equal(normalizeProfileMenuScreen('future-screen'), 'root')
  assert.equal(normalizeProfileMenuScreen(null), 'root')
})

test('profile loyalty state keeps loading, error, empty, and ready exclusive', () => {
  assert.equal(getProfileMenuLoyaltyState({ status: 'loading' }), 'loading')
  assert.equal(
    getProfileMenuLoyaltyState({ status: 'loading', errorMessage: 'Offline' }),
    'loading',
  )
  assert.equal(getProfileMenuLoyaltyState({ status: 'idle', errorMessage: 'Offline' }), 'error')
  assert.equal(getProfileMenuLoyaltyState({ status: 'ready', rewards: [] }), 'empty')
  assert.equal(getProfileMenuLoyaltyState({ status: 'ready', rewards: [{ id: 'reward-1' }] }), 'ready')
})
