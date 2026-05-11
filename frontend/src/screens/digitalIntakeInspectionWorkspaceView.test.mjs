import test from 'node:test'
import assert from 'node:assert/strict'

import { getIntakeWorkspaceHeroCopy } from './digitalIntakeInspectionWorkspaceView.mjs'

test('staff hero copy matches the intake-first workspace wording', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Car Intake Inspection',
    description: 'Record vehicle condition before service begins.',
  })
})

test('technician hero copy stays intake-first and concise', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(true), {
    title: 'Car Intake Inspection',
    description: 'Record vehicle condition before service begins.',
  })
})
