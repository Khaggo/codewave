import { formatStatusLabel } from '../insuranceView.mjs'

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const ACTIVE_RENEWAL_WORKSPACE_STATUSES = ['upcoming', 'quote_preparing', 'quoted', 'awaiting_customer']
const NON_ACTIVE_RENEWAL_STATUSES = ['renewed', 'cancelled', 'not_applicable', 'expired']
const TERMINAL_INQUIRY_STATUSES = ['closed', 'cancelled', 'rejected']

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

const toDateInputValue = (value) => {
  const date = toDate(value)

  if (!date) {
    return ''
  }

  return date.toISOString().slice(0, 10)
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

const isActiveRenewalQueueInquiry = (inquiry) =>
  !TERMINAL_INQUIRY_STATUSES.includes(inquiry?.status) && !NON_ACTIVE_RENEWAL_STATUSES.includes(inquiry?.renewalStatus)

export const isRenewalWorkspaceInquiry = (inquiry = {}) =>
  isActiveRenewalQueueInquiry(inquiry) &&
  (inquiry?.purpose === 'renewal' ||
    inquiry?.status === 'for_renewal' ||
    ACTIVE_RENEWAL_WORKSPACE_STATUSES.includes(inquiry?.renewalStatus))

export function mergeRenewalInquiryUpdate(inquiries = [], updatedInquiry) {
  if (!updatedInquiry?.id) {
    return inquiries
  }

  return inquiries.map((inquiry) => (inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry))
}

export function shouldApplyRenewalAsyncResult({ requestInquiryId, selectedInquiryId } = {}) {
  return Boolean(requestInquiryId) && requestInquiryId === selectedInquiryId
}

const countRenewalsByWindow = (inquiries, timeWindow, now) =>
  inquiries.reduce(
    (total, inquiry) =>
      total +
      (isActiveRenewalQueueInquiry(inquiry) &&
      getRenewalTimeWindow({
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
      value: inquiries.reduce(
        (total, inquiry) =>
          total + (isActiveRenewalQueueInquiry(inquiry) && inquiry?.renewalStatus === 'awaiting_customer' ? 1 : 0),
        0,
      ),
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

export function buildRenewalUpdateDraft(inquiry = {}) {
  return {
    status: inquiry?.status ?? 'for_renewal',
    renewalStatus: inquiry?.renewalStatus ?? 'upcoming',
    policyExpiryAt: toDateInputValue(inquiry?.policyExpiryAt),
    renewalDueAt: toDateInputValue(inquiry?.renewalDueAt),
    assignedStaffId: inquiry?.assignedStaffId ?? '',
    reviewNotes: typeof inquiry?.reviewNotes === 'string' ? inquiry.reviewNotes : '',
  }
}

export function filterRenewalItems(renewalItems = [], { filters = {} } = {}) {
  const searchNeedle = String(filters.search ?? '').trim().toLowerCase()

  return renewalItems.filter(({ inquiry, row }) => {
    if (filters.renewalStatus && filters.renewalStatus !== 'all' && inquiry?.renewalStatus !== filters.renewalStatus) {
      return false
    }

    if (filters.timeWindow && filters.timeWindow !== 'all' && row?.timeWindow !== filters.timeWindow) {
      return false
    }

    if (filters.manualOnly && inquiry?.purpose !== 'renewal') {
      return false
    }

    if (!searchNeedle) {
      return true
    }

    return [
      inquiry?.id,
      inquiry?.customerDisplayName,
      inquiry?.vehicleLabel,
      inquiry?.subject,
      inquiry?.policyNumber,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchNeedle))
  })
}

const describeRenewalWindow = (timeWindow) => {
  if (!timeWindow || timeWindow === 'all') {
    return 'all renewal windows'
  }

  return `${timeWindow} renewals`
}

const describeRenewalStatus = (renewalStatus) => {
  if (!renewalStatus || renewalStatus === 'all') {
    return null
  }

  return formatStatusLabel(renewalStatus).toLowerCase()
}

export function getRenewalsFilterSummary({ filters = {}, visibleCount = 0, totalCount = 0 } = {}) {
  const descriptors = [describeRenewalWindow(filters.timeWindow)]

  const renewalStatusDescriptor = describeRenewalStatus(filters.renewalStatus)
  if (renewalStatusDescriptor) {
    descriptors.push(renewalStatusDescriptor)
  }

  if (filters.manualOnly) {
    descriptors.push('manual follow-ups only')
  }

  const trimmedSearch = String(filters.search ?? '').trim()
  if (trimmedSearch) {
    descriptors.push(`matching "${trimmedSearch}"`)
  }

  const hiddenCount = Math.max(totalCount - visibleCount, 0)
  const tone = filters.timeWindow === 'Overdue' || filters.timeWindow === 'Due in 7 Days' ? 'urgent' : visibleCount ? 'focused' : 'empty'
  const noun = visibleCount === 1 ? 'renewal needs' : 'renewals need'
  const hiddenCopy =
    hiddenCount > 0
      ? ` ${hiddenCount} other ${hiddenCount === 1 ? 'renewal is' : 'renewals are'} outside this focus view.`
      : ''

  return {
    tone,
    title: `${visibleCount} ${noun} attention now`,
    detail: `Showing ${descriptors.join(', ')}.${hiddenCopy}`.trim(),
  }
}
