import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createQaReviewRequestCoordinator,
  isQaReviewTargetCurrent,
} from './qaReviewRequestCoordinator.mjs'

test('starting a different QA entity aborts and invalidates the previous request', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const first = coordinator.begin('job-order-a')
  const second = coordinator.begin('job-order-b')

  assert.equal(first.signal.aborted, true)
  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(second), true)
})

test('refreshing the same QA entity invalidates its previous request', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const first = coordinator.begin('job-order-a')
  const refresh = coordinator.begin('job-order-a')

  assert.equal(first.signal.aborted, true)
  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(refresh), true)
  assert.notEqual(first.requestId, refresh.requestId)
})

test('clearing the QA selection invalidates the active token', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const active = coordinator.begin('job-order-a')

  coordinator.invalidate()

  assert.equal(active.signal.aborted, true)
  assert.equal(coordinator.isCurrent(active), false)
})

test('disposing the coordinator aborts active work', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const active = coordinator.begin('job-order-a')

  coordinator.dispose()

  assert.equal(active.signal.aborted, true)
  assert.equal(coordinator.isCurrent(active), false)
})

test('a stale success token cannot become current again', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const staleSuccess = coordinator.begin('job-order-a')

  coordinator.begin('job-order-b')

  assert.equal(coordinator.isCurrent(staleSuccess), false)
})

test('a stale failure token cannot clear the current request', () => {
  const coordinator = createQaReviewRequestCoordinator()
  const staleFailure = coordinator.begin('job-order-a')
  const current = coordinator.begin('job-order-b')

  assert.equal(coordinator.isCurrent(staleFailure), false)
  assert.equal(coordinator.isCurrent(current), true)
})

test('QA actions require ready detail, selection, and gate ids to match', () => {
  const readyDetail = {
    entityId: 'job-order-b',
    requestId: 2,
    status: 'ready',
  }

  assert.equal(
    isQaReviewTargetCurrent({
      detailState: readyDetail,
      selectedEntityId: 'job-order-b',
      qualityGate: { jobOrderId: 'job-order-b' },
    }),
    true,
  )
  assert.equal(
    isQaReviewTargetCurrent({
      detailState: readyDetail,
      selectedEntityId: 'job-order-b',
      qualityGate: { jobOrderId: 'job-order-a' },
    }),
    false,
  )
  assert.equal(
    isQaReviewTargetCurrent({
      detailState: { ...readyDetail, status: 'loading' },
      selectedEntityId: 'job-order-b',
      qualityGate: { jobOrderId: 'job-order-b' },
    }),
    false,
  )
})
