import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getShellRouteMeta, getSidebarWidth } from './layoutShellView.mjs'
import { getPortalLinkKind } from '../portalLinkModel.mjs'
import {
  isStaffPortalNavigationActive,
  shouldHandleStaffPortalNavigation,
} from './staffPortalNavigationModel.mjs'

test('getShellRouteMeta returns configured route copy and fallback metadata', () => {
  assert.deepEqual(getShellRouteMeta('/admin/invoices'), {
    title: 'Service Invoices',
    subtitle: 'Finalized job-order invoices and payment status',
  })

  assert.deepEqual(getShellRouteMeta('/missing-route'), {
    title: 'Cruisers Crib Portal',
    subtitle: 'Operations workspace',
  })

  assert.deepEqual(getShellRouteMeta('/admin/job-orders/job-123'), {
    title: 'Job Orders',
    subtitle: 'Execution handoff, progress, evidence, and completion',
  })
})

test('getSidebarWidth matches collapsed and expanded sidebar widths', () => {
  assert.equal(getSidebarWidth(true), 72)
  assert.equal(getSidebarWidth(false), 256)
})

test('PortalLink keeps portal routes on Next client navigation and external links as anchors', () => {
  assert.equal(getPortalLinkKind('/settings'), 'next')
  assert.equal(getPortalLinkKind('/admin/job-orders/active?view=mine'), 'next')
  assert.equal(getPortalLinkKind({ pathname: '/admin/invoices', query: { state: 'open' } }), 'next')
  assert.equal(getPortalLinkKind('https://example.com/help'), 'anchor')
  assert.equal(getPortalLinkKind('mailto:support@example.com'), 'anchor')

  const portalLinkSource = readFileSync(new URL('../PortalLink.js', import.meta.url), 'utf8')
  assert.match(portalLinkSource, /import Link from 'next\/link'/)
  assert.match(portalLinkSource, /<Link href=\{href\}/)
  assert.match(portalLinkSource, /<Link href=\{href\} \{\.\.\.props\}>/)
})

test('Service Management uses SPA navigation and route-derived active state for click and keyboard activation', () => {
  assert.equal(isStaffPortalNavigationActive('/admin/services', '/admin/services'), true)
  assert.equal(isStaffPortalNavigationActive('/', '/admin/services'), false)
  assert.equal(shouldHandleStaffPortalNavigation({ pathname: '/', href: '/admin/services', button: 0 }), true)
  assert.equal(shouldHandleStaffPortalNavigation({ pathname: '/', href: '/admin/services', button: 0, ctrlKey: true }), false)
  assert.equal(shouldHandleStaffPortalNavigation({ pathname: '/admin/services', href: '/admin/services', button: 0 }), false)

  const sidebarSource = readFileSync(new URL('./Sidebar.js', import.meta.url), 'utf8')
  const routeSource = readFileSync(new URL('../../app/admin/services/page.js', import.meta.url), 'utf8')
  assert.match(sidebarSource, /router\.push\(href\)/)
  assert.match(sidebarSource, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(sidebarSource, /href !== '\/admin\/services'/)
  assert.match(routeSource, /BookingServiceAdmin/)
})
