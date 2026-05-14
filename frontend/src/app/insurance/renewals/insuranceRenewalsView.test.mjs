import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRenewalsTableRow,
  getRenewalsSummaryCards,
  getRenewalTimeWindow,
} from './insuranceRenewalsView.mjs'

const buildInquiryFixture = (overrides = {}) => ({
  id: 'renewal-1',
  customerDisplayName: 'Casey Customer',
  vehicleLabel: 'Toyota Vios (INS110A)',
  status: 'for_renewal',
  renewalStatus: 'upcoming',
  renewalDueAt: '2026-05-29T00:00:00.000Z',
  policyExpiryAt: '2026-06-15T00:00:00.000Z',
  ...overrides,
})

test('getRenewalsSummaryCards counts due windows, overdue cases, and awaiting-customer renewals', () => {
  assert.deepEqual(
    getRenewalsSummaryCards({
      now: '2026-05-14T00:00:00.000Z',
      inquiries: [
        buildInquiryFixture({ id: 'inq-30', renewalStatus: 'upcoming', renewalDueAt: '2026-06-13T00:00:00.000Z' }),
        buildInquiryFixture({ id: 'inq-15', renewalStatus: 'upcoming', renewalDueAt: '2026-05-29T00:00:00.000Z' }),
        buildInquiryFixture({
          id: 'inq-7',
          renewalStatus: 'quote_preparing',
          renewalDueAt: '2026-05-21T00:00:00.000Z',
        }),
        buildInquiryFixture({ id: 'inq-overdue', renewalStatus: 'quoted', renewalDueAt: '2026-05-13T00:00:00.000Z' }),
        buildInquiryFixture({
          id: 'inq-awaiting',
          renewalStatus: 'awaiting_customer',
          renewalDueAt: '2026-05-26T00:00:00.000Z',
        }),
        buildInquiryFixture({
          id: 'inq-later',
          renewalStatus: 'upcoming',
          renewalDueAt: '2026-07-01T00:00:00.000Z',
        }),
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['Due in 30 Days', 1],
      ['Due in 15 Days', 2],
      ['Due in 7 Days', 1],
      ['Overdue', 1],
      ['Awaiting Customer', 1],
    ],
  )
})

test('getRenewalTimeWindow falls back to policyExpiryAt when renewalDueAt is missing', () => {
  assert.equal(
    getRenewalTimeWindow({
      renewalDueAt: null,
      policyExpiryAt: '2026-05-21T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    'Due in 7 Days',
  )
})

test('buildRenewalsTableRow prioritizes renewalDueAt over policyExpiryAt and formats approved renewal stages', () => {
  assert.deepEqual(
    buildRenewalsTableRow(
      buildInquiryFixture({
        id: 'renewal-quote',
        renewalStatus: 'quote_preparing',
        renewalDueAt: '2026-05-21T00:00:00.000Z',
        policyExpiryAt: '2026-05-30T00:00:00.000Z',
      }),
      {
        now: '2026-05-14T00:00:00.000Z',
      },
    ),
    {
      key: 'renewal-quote',
      customer: 'Casey Customer',
      vehicle: 'Toyota Vios (INS110A)',
      status: 'For Renewal',
      renewalStage: 'Quote Preparing',
      renewalDueAt: '2026-05-21T00:00:00.000Z',
      policyExpiryAt: '2026-05-30T00:00:00.000Z',
      timeWindow: 'Due in 7 Days',
    },
  )
})
