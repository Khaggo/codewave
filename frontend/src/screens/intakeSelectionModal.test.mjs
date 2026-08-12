import test from 'node:test'
import assert from 'node:assert/strict'

import {
  filterIntakeOptions,
  getIntakeChoiceOpenState,
  getIntakeOptionCategories,
  getIntakeSelectionSummary,
  normalizeIntakeOptions,
  normalizeSelectionValues,
  toggleIntakeSelection,
} from './intakeSelectionModal.mjs'

test('choice modal filtering supports search and service categories', () => {
  const options = [
    { value: 'oil', label: 'Oil change', category: 'Maintenance' },
    { value: 'brake', label: 'Brake inspection', category: 'Safety' },
  ]

  assert.deepEqual(getIntakeOptionCategories(options), ['Maintenance', 'Safety'])
  assert.deepEqual(filterIntakeOptions(options, { query: 'brake' }).map((option) => option.value), ['brake'])
  assert.deepEqual(filterIntakeOptions(options, { category: 'Maintenance' }).map((option) => option.value), ['oil'])
})

test('choice modal summaries and normalized string options stay stable', () => {
  assert.deepEqual(normalizeIntakeOptions(['Brake concern']), [
    { value: 'Brake concern', label: 'Brake concern', helper: '', category: 'Visit reasons' },
  ])
  assert.deepEqual(
    normalizeIntakeOptions([
      { value: 'oil', label: 'Oil change', category: 'Maintenance' },
      { value: 'oil', label: 'Duplicate oil change', category: 'Maintenance' },
    ]),
    [{ value: 'oil', label: 'Oil change', helper: '', category: 'Maintenance' }],
  )
  assert.deepEqual(getIntakeSelectionSummary(['oil', 'oil'], 4), { selected: 1, total: 4 })
  assert.deepEqual(getIntakeSelectionSummary(['oil', 'brake', 'oil'], 3), { selected: 2, total: 3 })
})

test('modal-wide selection preserves values outside the filtered visible subset', () => {
  let selection = toggleIntakeSelection([], 'brake')
  selection = toggleIntakeSelection(selection, 'oil')

  assert.deepEqual(normalizeSelectionValues(selection), ['brake', 'oil'])
  assert.deepEqual(toggleIntakeSelection(selection, 'brake'), ['oil'])
})

test('search and category filtering combine without changing the complete selection', () => {
  const options = [
    { value: 'oil', label: 'Oil change', category: 'Maintenance' },
    { value: 'brake', label: 'Brake inspection', category: 'Safety' },
    { value: 'coolant', label: 'Coolant flush', category: 'Maintenance' },
  ]

  assert.deepEqual(
    filterIntakeOptions(options, { query: 'oil', category: 'Maintenance' }).map((option) => option.value),
    ['oil'],
  )
  assert.deepEqual(normalizeSelectionValues(['brake', 'oil', 'brake']), ['brake', 'oil'])
})

test('choice draft initializes only on closed-to-open and ignores prop identity while open', () => {
  const opened = getIntakeChoiceOpenState({
    open: true,
    wasOpen: false,
    selectedValues: ['brake', 'brake'],
  })
  assert.deepEqual(opened, {
    wasOpen: true,
    initialize: true,
    query: '',
    category: 'all',
    selectedValues: ['brake'],
  })

  const whileOpen = getIntakeChoiceOpenState({
    open: true,
    wasOpen: opened.wasOpen,
    selectedValues: ['oil'],
  })
  assert.deepEqual(whileOpen, { wasOpen: true, initialize: false })

  const closed = getIntakeChoiceOpenState({ open: false, wasOpen: whileOpen.wasOpen, selectedValues: ['oil'] })
  assert.deepEqual(closed, { wasOpen: false, initialize: false })

  assert.deepEqual(
    getIntakeChoiceOpenState({ open: true, wasOpen: closed.wasOpen, selectedValues: ['oil'] }).selectedValues,
    ['oil'],
  )
})
