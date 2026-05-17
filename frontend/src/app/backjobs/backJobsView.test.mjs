import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBackJobReworkDraft,
  buildBackJobStatusDraft,
  getBackJobCounts,
  resolveBackJobReworkServiceAdviser,
  splitCommaSeparatedIds,
  toggleDelimitedIdValue,
  upsertBackJob,
} from './backJobsView.mjs'

test('splitCommaSeparatedIds trims whitespace and removes blanks', () => {
  assert.deepEqual(splitCommaSeparatedIds(' tech-1, tech-2 ,, tech-3 '), ['tech-1', 'tech-2', 'tech-3'])
})

test('toggleDelimitedIdValue adds and removes technician ids cleanly', () => {
  assert.equal(toggleDelimitedIdValue('tech-1, tech-2', 'tech-3', true), 'tech-1, tech-2, tech-3')
  assert.equal(toggleDelimitedIdValue('tech-1, tech-2', 'tech-2', false), 'tech-1')
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

test('buildBackJobStatusDraft resets notes and uses the first allowed transition', () => {
  assert.deepEqual(
    buildBackJobStatusDraft({
      backJob: { id: 'bj-1', returnInspectionId: 'insp-1' },
      allowedTargets: ['approved_for_rework', 'closed'],
    }),
    {
      status: 'approved_for_rework',
      returnInspectionId: 'insp-1',
      reviewNotes: '',
      resolutionNotes: '',
    },
  )
})

test('buildBackJobReworkDraft returns a fresh default draft', () => {
  assert.deepEqual(buildBackJobReworkDraft(), {
    itemName: 'Warranty rework',
    itemDescription: '',
    estimatedHours: '1',
    notes: '',
    assignedTechnicianIdsText: '',
  })
})

test('resolveBackJobReworkServiceAdviser prefers the original job-order snapshot', () => {
  assert.deepEqual(
    resolveBackJobReworkServiceAdviser({
      activeBackJob: { originalJobOrderId: 'jo-1' },
      vehicleJobOrders: [
        {
          id: 'jo-1',
          serviceAdviserUserId: 'adv-1',
          serviceAdviserCode: 'STA-1001',
        },
      ],
      sessionUserId: 'admin-1',
      sessionUserRole: 'super_admin',
      sessionStaffCode: 'ADM-1001',
    }),
    {
      serviceAdviserUserId: 'adv-1',
      serviceAdviserCode: 'STA-1001',
      source: 'original_job_order',
    },
  )
})

test('resolveBackJobReworkServiceAdviser falls back to the live session only for service advisers', () => {
  assert.deepEqual(
    resolveBackJobReworkServiceAdviser({
      activeBackJob: { originalJobOrderId: 'jo-missing' },
      vehicleJobOrders: [],
      sessionUserId: 'adv-2',
      sessionUserRole: 'service_adviser',
      sessionStaffCode: 'STA-2001',
    }),
    {
      serviceAdviserUserId: 'adv-2',
      serviceAdviserCode: 'STA-2001',
      source: 'session_user',
    },
  )
})
