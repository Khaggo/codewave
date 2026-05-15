import test from 'node:test'
import assert from 'node:assert/strict'

import { getGroupedQualityFindings, sortQualityFindings } from './qaAuditView.mjs'

const findings = [
  {
    id: '2',
    severity: 'warning',
    gate: 'photos',
    code: 'warn',
    createdAt: '2026-01-01T10:00:00Z',
    riskContribution: 10,
  },
  {
    id: '1',
    severity: 'critical',
    gate: 'inspection',
    code: 'crit',
    createdAt: '2026-01-02T10:00:00Z',
    riskContribution: 20,
  },
  {
    id: '3',
    severity: 'info',
    gate: 'notes',
    code: 'info',
    createdAt: '2026-01-03T10:00:00Z',
    riskContribution: 1,
  },
]

test('sortQualityFindings prioritizes severity then risk', () => {
  const sorted = sortQualityFindings(findings)
  assert.deepEqual(sorted.map((finding) => finding.id), ['1', '2', '3'])
})

test('getGroupedQualityFindings groups findings by severity buckets', () => {
  const grouped = getGroupedQualityFindings(findings)
  assert.deepEqual(
    grouped.map((group) => [group.key, group.items.length]),
    [
      ['critical', 1],
      ['warning', 1],
      ['info', 1],
    ],
  )
})

test('getGroupedQualityFindings keeps blocking findings ahead of review-needed findings', () => {
  const grouped = getGroupedQualityFindings([
    { id: 'w1', severity: 'warning', gate: 'notes', code: 'warn' },
    { id: 'c1', severity: 'critical', gate: 'photos', code: 'crit' },
  ])

  assert.equal(grouped[0].key, 'critical')
  assert.equal(grouped[1].key, 'warning')
})
