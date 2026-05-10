import test from 'node:test'
import assert from 'node:assert/strict'

import { getBackJobCounts, splitCommaSeparatedIds, upsertBackJob } from './backJobsView.mjs'

test('splitCommaSeparatedIds trims whitespace and removes blanks', () => {
  assert.deepEqual(splitCommaSeparatedIds(' tech-1, tech-2 ,, tech-3 '), ['tech-1', 'tech-2', 'tech-3'])
})

test('upsertBackJob replaces an existing case and keeps others', () => {
  assert.deepEqual(
    upsertBackJob(
      [
        { id: 'bj-1', status: 'reported' },
        { id: 'bj-2', status: 'resolved' },
      ],
      { id: 'bj-1', status: 'approved_for_rework' },
    ),
    [
      { id: 'bj-1', status: 'approved_for_rework' },
      { id: 'bj-2', status: 'resolved' },
    ],
  )
})

test('getBackJobCounts summarizes total, reported, approved, and unresolved', () => {
  assert.deepEqual(
    getBackJobCounts([
      { id: 'bj-1', status: 'reported' },
      { id: 'bj-2', status: 'approved_for_rework' },
      { id: 'bj-3', status: 'resolved' },
      { id: 'bj-4', status: 'in_progress' },
    ]),
    {
      total: 4,
      reported: 1,
      approved: 1,
      unresolved: 3,
    },
  )
})
