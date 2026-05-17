import test from 'node:test'
import assert from 'node:assert/strict'

import { getInspectionMessageTone, splitRefs } from './digitalIntakeInspectionView.mjs'

test('splitRefs handles commas, new lines, and whitespace', () => {
  assert.deepEqual(
    splitRefs('upload://one, upload://two\nupload://three'),
    ['upload://one', 'upload://two', 'upload://three'],
  )
})

test('getInspectionMessageTone maps capture and history states', () => {
  assert.equal(getInspectionMessageTone('capture_saved_verified'), 'success')
  assert.equal(getInspectionMessageTone('history_empty'), 'warning')
  assert.equal(getInspectionMessageTone('history_loading'), 'info')
  assert.equal(getInspectionMessageTone('capture_failed'), 'danger')
})
