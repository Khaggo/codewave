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

test('getRenewalsSummaryCards keeps awaiting-customer coverage, ignores undated items, and updates the due-in-30 copy', () => {
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
        buildInquiryFixture({
          id: 'inq-undated',
          renewalStatus: 'upcoming',
          renewalDueAt: 'not-a-date',
          policyExpiryAt: '',
        }),
      ],
    }).map((card) => ({ label: card.label, value: card.value, sub: card.sub })),
    [
      {
        label: 'Due in 30 Days',
        value: 2,
        sub: 'Renewals outside the urgent follow-up windows',
      },
      {
        label: 'Due in 15 Days',
        value: 2,
        sub: 'Renewals approaching in the next two weeks',
      },
      {
        label: 'Due in 7 Days',
        value: 1,
        sub: 'Renewals needing immediate follow-up',
      },
      {
        label: 'Overdue',
        value: 1,
        sub: 'Renewals past their target date',
      },
      {
        label: 'Awaiting Customer',
        value: 1,
        sub: 'Renewals waiting on customer response',
      },
    ],
  )
})

test('getRenewalsSummaryCards excludes completed and non-active renewal statuses from urgency buckets', () => {
  assert.deepEqual(
    getRenewalsSummaryCards({
      now: '2026-05-14T00:00:00.000Z',
      inquiries: [
        buildInquiryFixture({ id: 'active-30', renewalStatus: 'upcoming', renewalDueAt: '2026-06-13T00:00:00.000Z' }),
        buildInquiryFixture({ id: 'active-15', renewalStatus: 'quoted', renewalDueAt: '2026-05-29T00:00:00.000Z' }),
        buildInquiryFixture({
          id: 'active-7',
          renewalStatus: 'awaiting_customer',
          renewalDueAt: '2026-05-20T00:00:00.000Z',
        }),
        buildInquiryFixture({ id: 'active-overdue', renewalStatus: 'quote_preparing', renewalDueAt: '2026-05-13T00:00:00.000Z' }),
        buildInquiryFixture({ id: 'renewed-ignored', renewalStatus: 'renewed', renewalDueAt: '2026-05-20T00:00:00.000Z' }),
        buildInquiryFixture({
          id: 'cancelled-ignored',
          renewalStatus: 'cancelled',
          renewalDueAt: '2026-05-29T00:00:00.000Z',
        }),
        buildInquiryFixture({
          id: 'not-applicable-ignored',
          renewalStatus: 'not_applicable',
          renewalDueAt: '2026-06-13T00:00:00.000Z',
        }),
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['Due in 30 Days', 1],
      ['Due in 15 Days', 1],
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

test('getRenewalTimeWindow falls back to policyExpiryAt when renewalDueAt is blank or invalid', () => {
  assert.equal(
    getRenewalTimeWindow({
      renewalDueAt: '   ',
      policyExpiryAt: '2026-05-21T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    'Due in 7 Days',
  )

  assert.equal(
    getRenewalTimeWindow({
      renewalDueAt: 'not-a-date',
      policyExpiryAt: '2026-05-29T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    'Due in 15 Days',
  )
})

test('getRenewalTimeWindow returns only approved window labels for dates beyond 30 days', () => {
  assert.equal(
    getRenewalTimeWindow({
      renewalDueAt: '2026-07-20T00:00:00.000Z',
      now: '2026-05-14T00:00:00.000Z',
    }),
    'Due in 30 Days',
  )
})

test('getRenewalTimeWindow returns a neutral value when no valid target date exists', () => {
  assert.equal(
    getRenewalTimeWindow({
      renewalDueAt: 'not-a-date',
      policyExpiryAt: '',
      now: '2026-05-14T00:00:00.000Z',
    }),
    null,
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
