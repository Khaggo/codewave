import assert from 'node:assert/strict'
import test from 'node:test'

import {
  claimMatchesWork,
  getJobOrderClaimConflictMessage,
  isStaffWorkClaimError,
  recoverMatchingJobOrderClaim,
  toJobOrderClaimSummary,
} from './jobOrderClaimState.mjs'

test('claim summaries retain the queue entity identity', () => {
  assert.deepEqual(
    toJobOrderClaimSummary({
      claim: { id: 'claim-1', leaseExpiresAt: '2026-07-27T12:00:00.000Z' },
      entityId: 'job-1',
      entityType: 'job_order',
    }),
    {
      id: 'claim-1',
      entityId: 'job-1',
      entityType: 'job_order',
      leaseExpiresAt: '2026-07-27T12:00:00.000Z',
    },
  )
})

test('a claim can act only on its matching entity type and id', () => {
  const claim = toJobOrderClaimSummary({
    claim: { id: 'claim-1' },
    entityId: 'job-1',
  })

  assert.equal(claimMatchesWork(claim, 'job_order', 'job-1'), true)
  assert.equal(claimMatchesWork(claim, 'job_order', 'job-2'), false)
  assert.equal(claimMatchesWork(claim, 'booking_handoff', 'job-1'), false)
})

test('work-claim conflicts are distinguished from ordinary validation conflicts', () => {
  assert.equal(
    isStaffWorkClaimError({
      status: 409,
      details: { code: 'WORK_CLAIM_CONFLICT' },
    }),
    true,
  )
  assert.equal(
    isStaffWorkClaimError({
      status: 409,
      details: { code: 'JOB_ORDER_VERSION_CONFLICT' },
    }),
    false,
  )
})

test('direct workspace recovery uses the matching owned claim', () => {
  const claim = recoverMatchingJobOrderClaim(
    {
      items: [
        {
          entityType: 'job_order',
          entityId: 'job-1',
          claim: { id: 'claim-new', isMine: true },
        },
      ],
      session: {
        currentClaim: {
          id: 'claim-other',
          entityType: 'job_order',
          entityId: 'job-2',
        },
      },
    },
    'job-1',
  )

  assert.equal(claim.id, 'claim-new')
  assert.equal(claim.entityId, 'job-1')
})

test('same-record queue reopening retains the newly issued claim', () => {
  const oldClaim = toJobOrderClaimSummary({
    claim: { id: 'claim-old' },
    entityId: 'job-1',
  })
  const newClaim = toJobOrderClaimSummary({
    claim: { id: 'claim-new' },
    entityId: 'job-1',
  })

  assert.equal(claimMatchesWork(oldClaim, 'job_order', 'job-1'), true)
  assert.equal(claimMatchesWork(newClaim, 'job_order', 'job-1'), true)
  assert.equal(newClaim.id, 'claim-new')
})

test('direct recovery ignores another active Job Order claim', () => {
  assert.equal(
    recoverMatchingJobOrderClaim(
      {
        items: [],
        session: {
          currentClaim: {
            id: 'claim-other',
            entityType: 'job_order',
            entityId: 'job-2',
          },
        },
      },
      'job-1',
    ),
    null,
  )
})

test('claim conflicts provide actionable workspace messages', () => {
  for (const code of ['ACTIVE_WORK_EXISTS', 'WORK_CAPACITY_REACHED']) {
    assert.match(
      getJobOrderClaimConflictMessage({
        details: { code },
      }),
      /capacity.*complete or release/i,
    )
  }
  assert.match(
    getJobOrderClaimConflictMessage({
      details: { code: 'WORK_CLAIM_CONFLICT' },
    }),
    /changed or expired/i,
  )
})
