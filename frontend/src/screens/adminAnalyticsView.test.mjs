import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPartialErrorMessage, getVisibleAnalyticsTabs } from './adminAnalyticsView.mjs'

test('getVisibleAnalyticsTabs removes the summary review tab', () => {
  assert.deepEqual(
    getVisibleAnalyticsTabs([
      { key: 'overview', label: 'Overview' },
      { key: 'summaryReview', label: 'Summary Review' },
      { key: 'operations', label: 'Operations' },
    ]),
    [
      { key: 'overview', label: 'Overview' },
      { key: 'operations', label: 'Operations' },
    ],
  )
})

test('buildPartialErrorMessage flattens section errors into one readable sentence', () => {
  assert.equal(
    buildPartialErrorMessage([
      ['dashboard', 'Timed out'],
      ['auditTrail', 'Permission denied'],
    ]),
    'dashboard: Timed out auditTrail: Permission denied',
  )
})
