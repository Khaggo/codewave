import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLifecycleSummaryTone,
  getNotificationStatusLabel,
  getRewardOfferState,
  getTimelineToneKeys,
} from './dashboardCardPresentationModel.mjs'

test('notification labels distinguish action-required and informational updates', () => {
  assert.equal(getNotificationStatusLabel({ requiresAction: true, unread: true }), 'Action needed')
  assert.equal(getNotificationStatusLabel({ requiresAction: true, unread: false }), 'Still pending')
  assert.equal(getNotificationStatusLabel({ unread: true }), 'New update')
  assert.equal(getNotificationStatusLabel({ unread: false }), 'Viewed')
})

test('reward offer state clamps progress and disables unavailable or loading actions', () => {
  assert.deepEqual(
    getRewardOfferState({
      progress: 150,
      target: 100,
      available: true,
      loading: false,
    }),
    {
      progressRatio: 1,
      isButtonDisabled: false,
      buttonLabel: 'Claim',
    },
  )
  assert.equal(
    getRewardOfferState({ progress: 10, target: 0, available: false }).progressRatio,
    0,
  )
  assert.equal(
    getRewardOfferState({ available: true, loading: true }).isButtonDisabled,
    true,
  )
})

test('timeline and lifecycle tones use stable known fallbacks', () => {
  assert.deepEqual(getTimelineToneKeys({ statusTone: 'verified', typeTone: 'summary' }), {
    status: 'success',
    type: 'summary',
  })
  assert.deepEqual(getTimelineToneKeys({ statusTone: 'future', typeTone: 'future' }), {
    status: 'default',
    type: 'administrative',
  })
  assert.equal(getLifecycleSummaryTone('reviewed_summary_visible'), 'visible')
  assert.equal(getLifecycleSummaryTone('pending_summary_hidden'), 'pending')
  assert.equal(getLifecycleSummaryTone('future_state'), 'hidden')
})

