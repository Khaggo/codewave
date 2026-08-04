import assert from 'node:assert/strict'
import test from 'node:test'

import { formatServiceItemName } from '../lib/jobOrderServiceProgressModel.mjs'
import {
  buildServiceItemImmediatePayload,
  buildServiceItemMessageDraft,
  buildServiceItemRows,
  getServiceItemActions,
} from './jobOrderServiceItemsView.mjs'

test('service actions follow the current service state and evidence requirement', () => {
  assert.deepEqual(
    getServiceItemActions({ serviceState: 'todo' }).map((action) => action.label),
    ['Start service'],
  )
  assert.deepEqual(
    getServiceItemActions({ serviceState: 'blocked' }).map((action) => action.label),
    ['Resume service'],
  )
  assert.deepEqual(
    getServiceItemActions({
      serviceState: 'in_progress',
      requiresMissingEvidence: true,
    }).map((action) => action.label),
    ['Add update', 'Report blocker', 'Add photo'],
  )
  assert.deepEqual(
    getServiceItemActions({
      serviceState: 'in_progress',
      requiresMissingEvidence: false,
    }).map((action) => action.label),
    ['Add update', 'Report blocker', 'Mark complete'],
  )
  assert.deepEqual(getServiceItemActions({ serviceState: 'completed' }), [])
})

test('service rows derive progress state and evidence without mutating source records', () => {
  const items = [
    { id: 'todo', name: 'Inspection', requiresPhotoEvidence: true },
    { id: 'active', name: 'Alignment', requiresPhotoEvidence: true },
    { id: 'blocked', name: 'Paint', requiresPhotoEvidence: false },
    { id: 'done', name: 'Wash', isCompleted: true },
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
  ]

  const result = buildServiceItemRows({ items, progressEntries, photos })

  assert.equal(result.activeItems.length, 3)
  assert.equal(result.completedItems.length, 1)
  assert.equal(result.rows.find((item) => item.id === 'todo').serviceState, 'todo')
  assert.equal(
    result.rows.find((item) => item.id === 'todo').requiresMissingEvidence,
    true,
  )
  assert.equal(result.rows.find((item) => item.id === 'active').serviceState, 'in_progress')
  assert.equal(result.rows.find((item) => item.id === 'active').hasEvidence, true)
  assert.equal(
    result.rows.find((item) => item.id === 'active').requiresMissingEvidence,
    false,
  )
  assert.equal(result.rows.find((item) => item.id === 'blocked').serviceState, 'blocked')
  assert.equal(
    result.rows.find((item) => item.id === 'blocked').requiresMissingEvidence,
    false,
  )
  assert.equal(result.rows.find((item) => item.id === 'done').serviceState, 'completed')
  assert.equal(items[1].serviceState, undefined)
})

test('service actions create payloads linked to exactly one service item', () => {
  const item = {
    id: 'service-1',
    name: 'QA-ROUTE-CHECKLIST Wheel alignment',
  }

  assert.deepEqual(buildServiceItemMessageDraft(item, 'note'), {
    workItemId: 'service-1',
    entryType: 'note',
    message: '',
    completedItemIds: [],
  })
  assert.deepEqual(buildServiceItemImmediatePayload(item, 'work_started'), {
    workItemId: 'service-1',
    entryType: 'work_started',
    message: 'Wheel alignment started.',
    completedItemIds: [],
  })
  assert.deepEqual(buildServiceItemImmediatePayload(item, 'work_completed'), {
    workItemId: 'service-1',
    entryType: 'work_completed',
    message: 'Wheel alignment completed.',
    completedItemIds: ['service-1'],
  })
})

test('service names hide internal routing prefixes from staff', () => {
  assert.equal(
    formatServiceItemName({ name: 'QA-ROUTE-CHECKLIST Wheel alignment' }),
    'Wheel alignment',
  )
})
