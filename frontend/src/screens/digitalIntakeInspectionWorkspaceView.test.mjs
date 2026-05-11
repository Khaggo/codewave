import test from 'node:test'
import assert from 'node:assert/strict'

import { getIntakeWorkspaceHeroCopy } from './digitalIntakeInspectionWorkspaceView.mjs'

test('staff hero copy is concise and focused on vehicle records', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Capture Vehicle Condition Before Release Decisions',
    description: 'Record intake, pre-repair, completion, and return findings per vehicle.',
  })
})

test('technician hero copy stays concise after simplification', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(true), {
    title: 'Capture Vehicle Condition And Workshop Findings',
    description: 'Review history and save vehicle findings before and after service.',
  })
})
