import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getQaAiSummaryAction,
  getQaAiSummaryStatusLabel,
} from './qaAiSummaryPresentation.mjs'

test('QA AI summary presentation exposes retry and ready states without verdict semantics', () => {
  assert.deepEqual(
    getQaAiSummaryAction({
      qualityGate: { preCheckSummary: { aiSummary: { status: 'generation_failed' } } },
      canGenerate: true,
      actionStatus: 'ai_summary_failed',
    }),
    { label: 'Retry', disabled: false },
  )
  assert.equal(getQaAiSummaryStatusLabel('ready'), 'Ready')
})
