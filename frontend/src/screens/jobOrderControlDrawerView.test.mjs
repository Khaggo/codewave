import test from 'node:test'
import assert from 'node:assert/strict'

import {
  JOB_ORDER_CONTROL_DRAWER_TABS,
  buildJobOrderDrawerContextRows,
  getJobOrderDrawerAssignmentMeta,
  getJobOrderDrawerSourceLabel,
} from './jobOrderControlDrawerView.mjs'

test('control drawer tabs keep workflow, ownership, and context order', () => {
  assert.deepEqual(
    JOB_ORDER_CONTROL_DRAWER_TABS.map(({ key }) => key),
    ['overview', 'my_work', 'context'],
  )
})

test('back-job drawer copy uses public references and never raw source ids', () => {
  const rawSourceId = '5f8c3ed4-f89b-413d-bb5b-17d08eaadf21'

  assert.equal(
    getJobOrderDrawerSourceLabel({
      sourceType: 'back_job',
      sourceId: rawSourceId,
      sourceBackJobReference: 'BJ-20260729-0004',
    }),
    'Back-job BJ-20260729-0004',
  )
  assert.equal(
    getJobOrderDrawerSourceLabel({
      sourceType: 'back_job',
      sourceId: rawSourceId,
    }),
    'Back-job rework',
  )
  assert.equal(
    getJobOrderDrawerSourceLabel({
      sourceType: 'back_job',
      sourceId: rawSourceId,
    }).includes(rawSourceId),
    false,
  )
})

test('drawer context rows use safe fallbacks for incomplete records', () => {
  const rows = buildJobOrderDrawerContextRows({
    jobOrder: {
      sourceType: 'back_job',
      assignedTechnicianIds: [],
      photos: [],
      updatedAt: null,
    },
  })

  assert.deepEqual(rows.slice(0, 3), [
    ['Customer', 'Unknown customer'],
    ['Vehicle', 'Unknown vehicle'],
    ['Source', 'Back-job rework'],
  ])
  assert.deepEqual(rows.find(([label]) => label === 'Assigned team'), [
    'Assigned team',
    'No saved assignment',
  ])
})

test('active claim metadata uses ASCII workflow copy', () => {
  assert.equal(
    getJobOrderDrawerAssignmentMeta({
      stageLabel: 'Service Progress',
      activeClaimId: 'claim-1',
    }),
    'Service Progress - Claim active',
  )
  assert.equal(
    getJobOrderDrawerAssignmentMeta({ stageLabel: 'Service Progress' }),
    'Service Progress',
  )
})
