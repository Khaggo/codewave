import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatBookingReference,
  formatJobOrderReference,
} from './jobOrderWorkbenchViewModel.mjs'
import {
  formatQaJobOrderReference,
  getLoadedJobOrderReference,
} from './qaAuditPresentationModel.mjs'
import {
  buildQaVerdictCompletionState,
  getGroupedQualityFindings,
} from './qaAuditView.mjs'

test('staff workflow references prefer business identifiers over record ids', () => {
  const rawId = '18e50ca4-cf27-4f31-a9b7-635dca0aba02'

  assert.equal(
    formatBookingReference({
      id: rawId,
      bookingReference: 'BK-20260729-0042',
      scheduledDate: '2026-07-29',
    }),
    'BK-20260729-0042',
  )
  assert.equal(
    formatBookingReference({
      id: rawId,
      scheduledDate: '2026-07-29',
      plateNumber: 'ABC 1234',
    }),
    'Reference unavailable',
  )
  assert.equal(
    formatJobOrderReference({
      id: rawId,
      sourceBookingReference: 'BK-20260729-0042',
    }),
    'Reference unavailable',
  )
  assert.equal(
    formatJobOrderReference({
      id: rawId,
      sourceBackJobReference: 'BJ-20260729-0003',
    }),
    'Reference unavailable',
  )
})

test('QA resolves the selected reference from authoritative gate then queue context', () => {
  const jobOrderOptions = [
    {
      id: 'job-1',
      jobOrderReference: 'JO-20260729-0001',
    },
    {
      id: 'job-2',
      sourceBookingReference: 'BK-20260729-0002',
    },
  ]

  assert.equal(
    getLoadedJobOrderReference('job-1', jobOrderOptions, {
      jobOrderId: 'job-1',
      jobOrderReference: 'JO-20260729-GATE',
    }),
    'JO-20260729-GATE',
  )
  assert.equal(
    getLoadedJobOrderReference('job-1', jobOrderOptions),
    'JO-20260729-0001',
  )
  assert.equal(
    getLoadedJobOrderReference('', jobOrderOptions, { jobOrderId: 'job-2' }),
    'Reference unavailable',
  )
  assert.equal(getLoadedJobOrderReference('', []), 'Reference unavailable')
  assert.equal(
    formatQaJobOrderReference({
      jobType: 'back_job',
      sourceBackJobReference: 'BJ-20260729-0003',
    }),
    'Reference unavailable',
  )
})

test('QA discrepancy groups keep blocking findings ahead of review-needed findings', () => {
  const groups = getGroupedQualityFindings([
    { id: 'warning-1', severity: 'warning', riskContribution: 2 },
    { id: 'critical-1', severity: 'critical', riskContribution: 8 },
    { id: 'info-1', severity: 'info', riskContribution: 0 },
  ])

  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      title: group.title,
      ids: group.items.map((item) => item.id),
    })),
    [
      {
        key: 'critical',
        title: 'Blocking Findings',
        ids: ['critical-1'],
      },
      {
        key: 'warning',
        title: 'Review Needed',
        ids: ['warning-1'],
      },
      {
        key: 'info',
        title: 'Informational Findings',
        ids: ['info-1'],
      },
    ],
  )
})

test('QA completion receipts keep the business reference through pass and return flows', () => {
  assert.deepEqual(
    buildQaVerdictCompletionState({
      verdict: 'passed',
      reference: 'JO-20260729-0001',
    }),
    {
      wasBlocked: false,
      status: 'qa_completed',
      message:
        'JO-20260729-0001 passed QA. You can take the next review.',
      toastMessage:
        'JO-20260729-0001 is now cleared for finalization.',
    },
  )
  assert.deepEqual(
    buildQaVerdictCompletionState({
      verdict: 'blocked',
      reference: 'JO-20260729-0001',
    }),
    {
      wasBlocked: true,
      status: 'qa_completed',
      message:
        'JO-20260729-0001 was returned to Job Orders. You can take the next QA review.',
      toastMessage:
        'JO-20260729-0001 was returned for technician remediation.',
    },
  )
})
