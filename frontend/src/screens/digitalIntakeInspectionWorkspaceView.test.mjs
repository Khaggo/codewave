import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getIntakeWorkspaceHeroCopy,
  getIntakeWorkspacePrimaryActionLabel,
} from './digitalIntakeInspectionWorkspaceView.mjs'

test('staff hero copy matches the intake-first workspace wording', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(false), {
    title: 'Front-Desk Arrival Intake',
    description: 'Check in arrivals and capture vehicle condition before handoff.',
  })
})

test('technician hero copy stays intake-first and concise', () => {
  assert.deepEqual(getIntakeWorkspaceHeroCopy(true), {
    title: 'Front-Desk Arrival Intake',
    description: 'Check in arrivals and capture vehicle condition before handoff.',
  })
})

test('primary action labels stay concise across supported visit types', () => {
  assert.equal(getIntakeWorkspacePrimaryActionLabel('regular_service'), 'Start service check-in')
  assert.equal(
    getIntakeWorkspacePrimaryActionLabel('insurance_related'),
    'Start insurance check-in',
  )
  assert.equal(
    getIntakeWorkspacePrimaryActionLabel('back_job_complaint'),
    'Start return visit check-in',
  )
  assert.equal(
    getIntakeWorkspacePrimaryActionLabel('inspection_only'),
    'Start inspection check-in',
  )
})

test('primary action labels fall back safely for missing visit types', () => {
  assert.equal(getIntakeWorkspacePrimaryActionLabel(undefined), 'Start intake check-in')
  assert.equal(getIntakeWorkspacePrimaryActionLabel('unknown_visit_type'), 'Start intake check-in')
})
