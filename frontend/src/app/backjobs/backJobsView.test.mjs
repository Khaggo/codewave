import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildBackJobReworkDraft,
  buildBackJobStatusDraft,
  getBackJobCounts,
  resolveBackJobReworkServiceAdviser,
  splitCommaSeparatedIds,
  toggleDelimitedIdValue,
  upsertBackJob,
} from './backJobsView.mjs'

const backJobsContentSource = readFileSync(new URL('./BackJobsContent.js', import.meta.url), 'utf8')

test('Back-Jobs table fills its container and keeps Review at the far right', () => {
  assert.match(backJobsContentSource, /<table className="data-table w-full min-w-\[760px\] table-fixed">/)
  assert.match(backJobsContentSource, /<colgroup>[\s\S]*<col className="w-\[21%\]" \/>[\s\S]*<col className="w-\[8%\]" \/>[\s\S]*<\/colgroup>/)
  assert.match(backJobsContentSource, /<th className="text-right">Action<\/th>/)
  assert.match(backJobsContentSource, /<td className="align-top text-right">[\s\S]*?aria-label=\{`Review/)
  assert.match(backJobsContentSource, /whitespace-normal break-words/)
})

test('Back-Jobs workspace uses tabs and focused progressive disclosure surfaces', () => {
  assert.match(backJobsContentSource, /role="tablist" aria-label="Back-job workspace views"/)
  assert.match(backJobsContentSource, /aria-orientation="horizontal"/)
  assert.match(backJobsContentSource, /View Case Details/)
  assert.match(backJobsContentSource, /Create New Back-Job/)
  assert.match(backJobsContentSource, /ref=\{caseWorkspaceTabRef\}[\s\S]*onKeyDown=\{handleWorkspaceTabKeyDown\}/)
  assert.match(backJobsContentSource, /ref=\{createWorkspaceTabRef\}[\s\S]*onKeyDown=\{handleWorkspaceTabKeyDown\}/)
  assert.match(backJobsContentSource, /event\.key === 'ArrowRight'[\s\S]*event\.key === 'ArrowDown'/)
  assert.match(backJobsContentSource, /event\.key === 'ArrowLeft'[\s\S]*event\.key === 'ArrowUp'/)
  assert.match(backJobsContentSource, /event\.key === 'Home'[\s\S]*event\.key === 'End'/)
  assert.match(backJobsContentSource, /event\.preventDefault\(\)[\s\S]*nextTabRef\.current\?\.focus\(\)/)
  assert.match(backJobsContentSource, /<details[\s\S]*Create Back-Job Case/)
  assert.match(backJobsContentSource, /<details[\s\S]*Create Linked Rework Job Order/)
  assert.match(backJobsContentSource, /setCreatePanelOpen\(event\.currentTarget\.open\)/)
  assert.match(backJobsContentSource, /setReworkPanelOpen\(event\.currentTarget\.open\)/)
})

test('Back-Jobs keeps selected, read-only, empty, and status states visible', () => {
  assert.match(backJobsContentSource, /aria-current=\{activeBackJob\?\.id === backJob\.id \? 'true' : undefined\}/)
  assert.match(backJobsContentSource, /Read-only details/)
  assert.match(backJobsContentSource, /<div className="empty-panel text-sm text-ink-muted" role="status">/)
  assert.match(backJobsContentSource, /aria-live="polite"/)
  assert.match(backJobsContentSource, /Next action for selected case/)
})

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
