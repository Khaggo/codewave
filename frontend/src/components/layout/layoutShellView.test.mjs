import test from 'node:test'
import assert from 'node:assert/strict'

import { getShellRouteMeta, getSidebarWidth } from './layoutShellView.mjs'

test('getShellRouteMeta returns configured route copy and fallback metadata', () => {
  assert.deepEqual(getShellRouteMeta('/admin/invoices'), {
    title: 'Invoices & Orders',
    subtitle: 'Invoice readiness and order record lookup',
  })

  assert.deepEqual(getShellRouteMeta('/missing-route'), {
    title: 'Cruisers Crib Portal',
    subtitle: 'Operations workspace',
  })
})

test('getSidebarWidth matches collapsed and expanded sidebar widths', () => {
  assert.equal(getSidebarWidth(true), 72)
  assert.equal(getSidebarWidth(false), 256)
})
