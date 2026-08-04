import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createWorkshopStageDraft,
  getWorkshopStageMessageClassName,
  getWorkshopStageOptions,
} from './jobOrderWorkshopStageView.mjs'

test('workshop stage drafts preserve authoritative current stages and clear old notes', () => {
  assert.deepEqual(createWorkshopStageDraft('quality_check'), {
    stage: 'quality_check',
    note: '',
  })
  assert.deepEqual(createWorkshopStageDraft(''), {
    stage: 'received',
    note: '',
  })
})

test('known workshop stages remain in customer journey order', () => {
  assert.deepEqual(
    getWorkshopStageOptions('in_repair').map((option) => option.value),
    ['received', 'diagnosis', 'in_repair', 'quality_check', 'ready'],
  )
})

test('future backend workshop stages stay selectable instead of disappearing', () => {
  const options = getWorkshopStageOptions('parts_waiting')

  assert.deepEqual(options.at(-1), {
    value: 'parts_waiting',
    label: 'Parts Waiting',
  })
})

test('workshop stage feedback uses danger styling only for errors', () => {
  assert.equal(
    getWorkshopStageMessageClassName('error'),
    'status-message status-message-danger',
  )
  assert.equal(
    getWorkshopStageMessageClassName('saved'),
    'status-message status-message-success',
  )
})

