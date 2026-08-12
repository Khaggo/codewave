import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { filterIntakeComboboxOptions, INTAKE_COMBOBOX_VISIBLE_LIMIT } from './intakeSearchComboboxOptions.mjs'
import {
  canApplyAdminCustomerSearchResult,
  normalizeAdminCustomerListResponse,
} from '../lib/adminCustomerListResponse.mjs'

const options = [
  { value: 'customer-1', label: 'Ana Santos', helper: 'ana@example.test · Registered', searchTerms: ['ana@example.test'] },
  { value: 'customer-2', label: 'Ben Cruz', helper: 'Walk-in profile', searchTerms: ['ben@example.test'] },
]

test('Intake combobox filtering includes labels, email/helper text, and vehicle search terms', () => {
  assert.deepEqual(filterIntakeComboboxOptions(options, 'ana@example').items.map((item) => item.value), ['customer-1'])
  assert.deepEqual(filterIntakeComboboxOptions(options, 'walk-in').items.map((item) => item.value), ['customer-2'])
})

test('Intake combobox caps visible matches and reports the limitation', () => {
  const result = filterIntakeComboboxOptions(Array.from({ length: 25 }, (_, index) => ({ value: `${index}`, label: `Record ${index}` })), '')
  assert.equal(result.items.length, INTAKE_COMBOBOX_VISIBLE_LIMIT)
  assert.equal(result.total, 25)
  assert.equal(result.limited, true)
})

test('customer-list adapter preserves legacy callers and stabilizes paged rollout shapes', () => {
  const legacy = [{ id: 'customer-1' }]
  assert.deepEqual(normalizeAdminCustomerListResponse(legacy), legacy)
  assert.deepEqual(normalizeAdminCustomerListResponse(legacy, { paged: true }), {
    items: legacy,
    pageInfo: { nextCursor: null, hasMore: false },
  })

  assert.deepEqual(normalizeAdminCustomerListResponse({
    items: [{ id: 'customer-2' }],
    pageInfo: { nextCursor: 'cursor-2' },
  }, { paged: true }), {
    items: [{ id: 'customer-2' }],
    pageInfo: { nextCursor: 'cursor-2', hasMore: true },
  })

  assert.deepEqual(normalizeAdminCustomerListResponse({
    data: { items: [], pageInfo: { nextCursor: null, hasMore: false } },
  }, { paged: true }), {
    items: [],
    pageInfo: { nextCursor: null, hasMore: false },
  })
})

test('customer-list adapter rejects malformed payloads and handles empty results', () => {
  assert.deepEqual(normalizeAdminCustomerListResponse([], { paged: true }), {
    items: [],
    pageInfo: { nextCursor: null, hasMore: false },
  })
  assert.throws(() => normalizeAdminCustomerListResponse(null, { paged: true }), /invalid response/i)
  assert.throws(() => normalizeAdminCustomerListResponse({ items: null }, { paged: true }), /invalid response/i)
})

test('customer search ignores stale and aborted responses', () => {
  assert.equal(canApplyAdminCustomerSearchResult({ requestSequence: 3, currentRequestSequence: 3 }), true)
  assert.equal(canApplyAdminCustomerSearchResult({ requestSequence: 2, currentRequestSequence: 3 }), false)
  assert.equal(canApplyAdminCustomerSearchResult({ aborted: true, requestSequence: 3, currentRequestSequence: 3 }), false)
})

test('workspace direct child imports resolve and the combobox renders', async (t) => {
  const { createServer } = await import('vite')
  const server = await createServer({
    root: fileURLToPath(new URL('../..', import.meta.url)),
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    resolve: {
      alias: { '@': fileURLToPath(new URL('..', import.meta.url)) },
    },
    server: { middlewareMode: true },
  })
  t.after(() => server.close())

  const [combobox, pager, choiceModal, walkInModal, components] = await Promise.all([
    server.ssrLoadModule('/src/screens/IntakeSearchCombobox.jsx'),
    server.ssrLoadModule('/src/screens/ArrivalInspectionPager.jsx'),
    server.ssrLoadModule('/src/screens/IntakeChoiceModal.jsx'),
    server.ssrLoadModule('/src/screens/WalkInCustomerModal.jsx'),
    server.ssrLoadModule('/src/screens/DigitalIntakeInspectionComponents.jsx'),
  ])

  assert.equal(typeof combobox.default, 'function')
  assert.equal(combobox.default, combobox.IntakeSearchCombobox)
  assert.equal(typeof pager.ArrivalInspectionPager, 'function')
  assert.equal(typeof choiceModal.IntakeChoiceModal, 'function')
  assert.equal(typeof walkInModal.WalkInCustomerModal, 'function')
  assert.equal(typeof components.InspectionCard, 'function')
  assert.equal(typeof components.IntakeFocusedModal, 'function')
  assert.equal(typeof components.IntakeSection, 'function')

  const [{ createElement }, { renderToStaticMarkup }] = await Promise.all([
    import('react'),
    import('react-dom/server'),
  ])
  const markup = renderToStaticMarkup(createElement(combobox.default, {
    label: 'Customer',
    value: '',
    options,
    onValueChange() {},
  }))
  assert.match(markup, /role="combobox"/)
})
