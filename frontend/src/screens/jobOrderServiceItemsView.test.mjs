import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildServiceItemRows,
  SERVICE_ITEM_STATE_META,
} from './jobOrderServiceItemsView.mjs'

test('service item rows preserve progress state and evidence requirements', () => {
  const items = [
    { id: 'todo', name: 'Inspection' },
    { id: 'active', name: 'Oil change' },
    { id: 'blocked', name: 'Brake repair' },
    { id: 'done', name: 'Road test', isCompleted: true },
  ]
  const progressEntries = [
    {
      workItemId: 'active',
      entryType: 'work_started',
      createdAt: '2026-07-29T01:00:00.000Z',
    },
    {
      workItemId: 'blocked',
      entryType: 'issue_found',
      createdAt: '2026-07-29T02:00:00.000Z',
    },
  ]
  const photos = [
    {
      linkedEntityType: 'work_item',
      linkedEntityId: 'active',
      deletedAt: null,
    },
    {
      linkedEntityType: 'work_item',
      linkedEntityId: 'blocked',
      deletedAt: '2026-07-29T03:00:00.000Z',
    },
  ]

  const result = buildServiceItemRows({ items, progressEntries, photos })

  assert.deepEqual(
    result.rows.map((item) => ({
      id: item.id,
      state: item.serviceState,
      missingEvidence: item.requiresMissingEvidence,
    })),
    [
      { id: 'todo', state: 'todo', missingEvidence: true },
      { id: 'active', state: 'in_progress', missingEvidence: false },
      { id: 'blocked', state: 'blocked', missingEvidence: true },
      { id: 'done', state: 'completed', missingEvidence: true },
    ],
  )
  assert.deepEqual(result.activeItems.map((item) => item.id), [
    'todo',
    'active',
    'blocked',
  ])
  assert.deepEqual(result.completedItems.map((item) => item.id), ['done'])
})

test('optional-evidence services never report missing evidence', () => {
  const { rows } = buildServiceItemRows({
    items: [{ id: 'optional', requiresPhotoEvidence: false }],
  })

  assert.equal(rows[0].hasEvidence, false)
  assert.equal(rows[0].requiresMissingEvidence, false)
})

test('service item metadata keeps every supported state renderable', () => {
  assert.deepEqual(Object.keys(SERVICE_ITEM_STATE_META), [
    'todo',
    'in_progress',
    'blocked',
    'completed',
  ])
})
