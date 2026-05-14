import { formatStatusLabel } from '../insuranceView.mjs'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const toDate = (value) => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toUtcStartOfDay = (value) => {
  const date = toDate(value)

  if (!date) {
    return null
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const getRenewalTargetDate = ({ renewalDueAt, policyExpiryAt } = {}) => {
  const renewalDueDate = toDate(renewalDueAt)

  if (renewalDueDate) {
    return renewalDueDate
  }

  return toDate(policyExpiryAt)
}

export function getRenewalTimeWindow({ renewalDueAt, policyExpiryAt, now } = {}) {
  const targetDay = toUtcStartOfDay(getRenewalTargetDate({ renewalDueAt, policyExpiryAt }))
  const currentDay = toUtcStartOfDay(now) ?? toUtcStartOfDay(new Date())

  if (targetDay === null || currentDay === null) {
    return null
  }

  const diffDays = Math.floor((targetDay - currentDay) / MS_PER_DAY)

  if (diffDays < 0) {
    return 'Overdue'
  }

  if (diffDays <= 7) {
    return 'Due in 7 Days'
  }

  if (diffDays <= 15) {
    return 'Due in 15 Days'
  }

  if (diffDays <= 30) {
    return 'Due in 30 Days'
  }

  return 'Due in 30 Days'
}

const countRenewalsByWindow = (inquiries, timeWindow, now) =>
  inquiries.reduce(
    (total, inquiry) =>
      total +
      (getRenewalTimeWindow({
        renewalDueAt: inquiry?.renewalDueAt,
        policyExpiryAt: inquiry?.policyExpiryAt,
        now,
      }) === timeWindow
        ? 1
        : 0),
    0,
  )

export function getRenewalsSummaryCards({ inquiries = [], now } = {}) {
  return [
    {
      label: 'Due in 30 Days',
      value: countRenewalsByWindow(inquiries, 'Due in 30 Days', now),
      sub: 'Renewals outside the urgent follow-up windows',
    },
    {
      label: 'Due in 15 Days',
      value: countRenewalsByWindow(inquiries, 'Due in 15 Days', now),
      sub: 'Renewals approaching in the next two weeks',
    },
    {
      label: 'Due in 7 Days',
      value: countRenewalsByWindow(inquiries, 'Due in 7 Days', now),
      sub: 'Renewals needing immediate follow-up',
    },
    {
      label: 'Overdue',
      value: countRenewalsByWindow(inquiries, 'Overdue', now),
      sub: 'Renewals past their target date',
    },
    {
      label: 'Awaiting Customer',
      value: inquiries.reduce((total, inquiry) => total + (inquiry?.renewalStatus === 'awaiting_customer' ? 1 : 0), 0),
      sub: 'Renewals waiting on customer response',
    },
  ]
}

export function buildRenewalsTableRow(inquiry, { now } = {}) {
  return {
    key: inquiry?.id ?? '',
    customer: inquiry?.customerDisplayName || 'Unknown customer',
    vehicle: inquiry?.vehicleLabel || 'Unknown vehicle',
    status: formatStatusLabel(inquiry?.status),
    renewalStage: formatStatusLabel(inquiry?.renewalStatus),
    renewalDueAt: inquiry?.renewalDueAt ?? null,
    policyExpiryAt: inquiry?.policyExpiryAt ?? null,
    timeWindow: getRenewalTimeWindow({
      renewalDueAt: inquiry?.renewalDueAt,
      policyExpiryAt: inquiry?.policyExpiryAt,
      now,
    }),
  }
}

export { formatStatusLabel }
