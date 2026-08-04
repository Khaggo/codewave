import test from 'node:test'
import assert from 'node:assert/strict'

import {
  WORKSPACE_INFORMATION_ARCHITECTURE,
  getWorkspaceSectionTitles,
  isConciseWorkspaceDescription,
} from './workspaceInformationArchitecture.mjs'

const expectedSectionTitles = Object.freeze({
  jobOrders: Object.freeze([
    'Workshop queue',
    'Service Progress',
    'QA handoff',
  ]),
  qaAudit: Object.freeze([
    'QA Queue',
    'Selected Audit',
    'Blocking Findings',
    'Verdict / Override',
  ]),
  invoices: Object.freeze([
    'Service Invoices',
    'Invoice Detail',
    'Payment Entries',
  ]),
  intake: Object.freeze([
    'Arrival',
    'Visit Type',
    'Customer Concern',
    'Requirements',
    'Arrival Inspection',
    'Inspection History',
    'Selected Inspection Detail',
  ]),
})

test('critical workspace descriptions remain concise single sentences', () => {
  for (const workspace of Object.values(WORKSPACE_INFORMATION_ARCHITECTURE)) {
    assert.equal(isConciseWorkspaceDescription(workspace.description), true)
  }

  assert.equal(isConciseWorkspaceDescription(''), false)
  assert.equal(isConciseWorkspaceDescription('One sentence. Another sentence.'), false)
  assert.equal(isConciseWorkspaceDescription(`${'x'.repeat(120)}.`), false)
})

test('critical workspaces expose their sections in the intended workflow order', () => {
  for (const [workspaceKey, titles] of Object.entries(expectedSectionTitles)) {
    assert.deepEqual(getWorkspaceSectionTitles(workspaceKey), titles)
  }
})

test('every configured section resolves to a unique non-empty title', () => {
  for (const workspaceKey of Object.keys(expectedSectionTitles)) {
    const titles = getWorkspaceSectionTitles(workspaceKey)
    assert.equal(titles.every((title) => title.trim().length > 0), true)
    assert.equal(new Set(titles).size, titles.length)
  }
})

test('workspace information architecture is immutable', () => {
  assert.equal(Object.isFrozen(WORKSPACE_INFORMATION_ARCHITECTURE), true)

  for (const workspace of Object.values(WORKSPACE_INFORMATION_ARCHITECTURE)) {
    assert.equal(Object.isFrozen(workspace), true)
    assert.equal(Object.isFrozen(workspace.sections), true)
    assert.equal(Object.isFrozen(workspace.sectionOrder), true)
  }
})

test('unknown workspaces do not expose section titles', () => {
  assert.deepEqual(getWorkspaceSectionTitles('unknown'), [])
})
