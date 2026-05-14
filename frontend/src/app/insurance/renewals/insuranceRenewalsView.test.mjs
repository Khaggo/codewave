import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACTIVE_RENEWAL_WORKSPACE_STATUSES,
  mergeRenewalInquiryUpdate,
  buildRenewalUpdateDraft,
  buildRenewalsTableRow,
  getRenewalsSummaryCards,
  getRenewalTimeWindow,
  shouldApplyRenewalAsyncResult,
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
        buildInquiryFixture({
          id: 'expired-ignored',
          renewalStatus: 'expired',
          renewalDueAt: '2026-05-20T00:00:00.000Z',
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

test('getRenewalsSummaryCards excludes terminal inquiry statuses from urgency and awaiting-customer metrics', () => {
  assert.deepEqual(
    getRenewalsSummaryCards({
      now: '2026-05-14T00:00:00.000Z',
      inquiries: [
        buildInquiryFixture({ id: 'active-30', status: 'for_renewal', renewalStatus: 'upcoming', renewalDueAt: '2026-06-13T00:00:00.000Z' }),
        buildInquiryFixture({
          id: 'closed-stale-renewal',
          status: 'closed',
          renewalStatus: 'upcoming',
          renewalDueAt: '2026-05-20T00:00:00.000Z',
        }),
        buildInquiryFixture({
          id: 'cancelled-awaiting',
          status: 'cancelled',
          renewalStatus: 'awaiting_customer',
          renewalDueAt: '2026-05-20T00:00:00.000Z',
        }),
      ],
    }).map((card) => [card.label, card.value]),
    [
      ['Due in 30 Days', 1],
      ['Due in 15 Days', 0],
      ['Due in 7 Days', 0],
      ['Overdue', 0],
      ['Awaiting Customer', 0],
    ],
  )
})

test('ACTIVE_RENEWAL_WORKSPACE_STATUSES only exposes live renewal stages for this workspace filter', () => {
  assert.deepEqual(ACTIVE_RENEWAL_WORKSPACE_STATUSES, ['upcoming', 'quote_preparing', 'quoted', 'awaiting_customer'])
})

test('mergeRenewalInquiryUpdate replaces the matching inquiry even when the renewal leaves the active queue', () => {
  const updatedInquiry = buildInquiryFixture({
    id: 'inq-active',
    renewalStatus: 'renewed',
    reviewNotes: 'Customer completed the renewal today.',
  })

  assert.deepEqual(
    mergeRenewalInquiryUpdate(
      [
        buildInquiryFixture({ id: 'inq-active', renewalStatus: 'quoted', reviewNotes: 'Quote sent yesterday.' }),
        buildInquiryFixture({ id: 'inq-other', renewalStatus: 'upcoming' }),
      ],
      updatedInquiry,
    ),
    [
      updatedInquiry,
      buildInquiryFixture({ id: 'inq-other', renewalStatus: 'upcoming' }),
    ],
  )
})

test('shouldApplyRenewalAsyncResult only applies row-level UI state when the same inquiry is still selected', () => {
  assert.equal(
    shouldApplyRenewalAsyncResult({
      requestInquiryId: 'inq-1',
      selectedInquiryId: 'inq-1',
    }),
    true,
  )

  assert.equal(
    shouldApplyRenewalAsyncResult({
      requestInquiryId: 'inq-1',
      selectedInquiryId: 'inq-2',
    }),
    false,
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

test('buildRenewalUpdateDraft keeps renewal workflow metadata editable for the renewals route', () => {
  assert.deepEqual(
    buildRenewalUpdateDraft({
      status: 'for_renewal',
      renewalStatus: 'quote_preparing',
      policyExpiryAt: '2026-06-20T00:00:00.000Z',
      renewalDueAt: '2026-06-15T00:00:00.000Z',
      assignedStaffId: 'staff-1',
      reviewNotes: 'Preparing quote',
    }),
    {
      status: 'for_renewal',
      renewalStatus: 'quote_preparing',
      policyExpiryAt: '2026-06-20',
      renewalDueAt: '2026-06-15',
      assignedStaffId: 'staff-1',
      reviewNotes: 'Preparing quote',
    },
  )
})
