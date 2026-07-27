import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { formatServiceItemName } from '../lib/jobOrderServiceProgressModel.mjs'

const workbenchSource = readFileSync(
  new URL('./JobOrderWorkbench.js', import.meta.url),
  'utf8',
)
const clientSource = readFileSync(
  new URL('../lib/jobOrderWorkbenchClient.js', import.meta.url),
  'utf8',
)

test('job-order progress is service focused instead of a global status form', () => {
  assert.ok(workbenchSource.includes('Start service'))
  assert.ok(workbenchSource.includes('Report blocker'))
  assert.ok(workbenchSource.includes('Mark complete'))
  assert.ok(workbenchSource.includes('Completed services ('))
  assert.ok(!workbenchSource.includes('Completed work items'))
  assert.ok(!workbenchSource.includes('Entry type'))
})

test('service progress links entries to one service and hides internal name prefixes', () => {
  assert.ok(workbenchSource.includes('workItemId: item.id'))
  assert.ok(workbenchSource.includes('formatServiceItemName(item)'))
  assert.ok(clientSource.includes('workItemId: trimOrUndefined(workItemId)'))
  assert.equal(
    formatServiceItemName({ name: 'QA-ROUTE-CHECKLIST Wheel alignment' }),
    'Wheel alignment',
  )
})

test('mobile actions stay in document flow and the drawer keeps the full queue on the board', () => {
  assert.ok(workbenchSource.includes('className="ops-action-primary mt-2 w-full md:hidden"'))
  assert.ok(!workbenchSource.includes('fixed inset-x-0 bottom-0 z-30'))

  const queueMounts = workbenchSource.match(/<StaffWorkQueue/g) ?? []
  assert.equal(queueMounts.length, 1)
  assert.ok(workbenchSource.includes('Open My Work board'))
})
