import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobOrderHistoryMetrics,
  buildJobOrderSummaryCards,
} from './jobOrderWorkspaceOverviewView.mjs'

test('history metrics preserve records, dates, and selected-date order', () => {
  assert.deepEqual(
    buildJobOrderHistoryMetrics({
      monthCount: 12,
      markedDateCount: 4,
      selectedDateCount: 2,
    }),
    [
      { label: 'Records', value: 12 },
      { label: 'Dates', value: 4 },
      { label: 'Selected', value: 2 },
    ],
  )
})

test('adviser summary guides an uncreated booking handoff into creation', () => {
  const cards = buildJobOrderSummaryCards({
    queueMode: 'handoff_create',
    handoffCount: 3,
    selectedCandidate: {
      serviceSummary: 'Oil change',
    },
  })

  assert.equal(cards[0].value, 'Ready to create')
  assert.equal(cards[1].value, 'Create first job order')
  assert.equal(cards[2].value, 'Ready to create')
  assert.match(cards[2].sub, /Oil change/)
})

test('technician summary keeps execution access and evidence readable', () => {
  const cards = buildJobOrderSummaryCards({
    isTechnician: true,
    canAppendProgress: true,
    activeJobOrder: {
      reference: 'JO-2026-0001',
      status: 'in_progress',
      assignedTechnicianIds: ['TECH-1'],
      photos: [{ fileName: 'before.jpg' }],
    },
    executionPhase: 'in_progress',
  })

  assert.equal(cards[0].value, 'Loaded')
  assert.equal(cards[2].value, 'Assigned')
  assert.equal(cards[3].value, '1 attached')
  assert.equal(cards[3].sub, 'before.jpg')
})

test('adviser completion summary uses invoice payment state when finalized artifacts exist', () => {
  const cards = buildJobOrderSummaryCards({
    activeJobOrder: {
      status: 'ready_for_qa',
      assignedTechnicianIds: [],
      photos: [],
      invoiceRecord: {
        paymentStatus: 'awaiting_payment',
        invoiceReference: 'INV-2026-0001',
      },
    },
    executionPhase: 'ready_for_qa',
  })

  assert.equal(cards[2].value, 'Unassigned')
  assert.equal(cards[3].value, 'Awaiting Payment')
  assert.equal(cards[3].sub, 'INV-2026-0001')
})

