import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildIntakeDraftPayload,
  createInitialIntakeDraft,
  getIntakeCompletionBlockers,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

test('drafts remain saveable without a sticker observation and send no verifier identity', () => {
  const payload = buildIntakeDraftPayload(createInitialIntakeDraft())
  assert.equal(payload.intakeData.stickerObservation, undefined)
  assert.equal('verifiedByUserId' in payload, false)
  assert.equal('verifiedByUserId' in payload.intakeData, false)
})

test('completion requires an observation and a concise reason when absent', () => {
  const draft = createInitialIntakeDraft()
  assert.ok(getIntakeCompletionBlockers(draft).some((item) => item.key === 'stickerObservation'))

  draft.stickerObservation = 'not_present'
  assert.ok(getIntakeCompletionBlockers(draft).some((item) => item.key === 'stickerObservationReason'))
  draft.stickerObservationReason = 'Sticker was not affixed at intake'

  const payload = buildIntakeDraftPayload(draft)
  assert.equal(payload.intakeData.stickerObservation, 'not_present')
  assert.equal(payload.intakeData.stickerObservationReason, 'Sticker was not affixed at intake')
})
