import { formatStatusLabel } from '../insuranceView.mjs'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const TERMINAL_INQUIRY_STATUSES = ['closed', 'cancelled', 'rejected']

const countMatchingInquiries = (inquiries, predicate) =>
  inquiries.reduce((total, inquiry) => (predicate(inquiry) ? total + 1 : total), 0)

const toDate = (value) => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDateInputValue = (value) => {
  const date = toDate(value)

  if (!date) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

export const getDaysOverdue = (paymentDueAt, now) => {
  const dueDate = toDate(paymentDueAt)
  const currentDate = toDate(now) ?? new Date()

  if (!dueDate || dueDate >= currentDate) {
    return 0
  }

  return Math.floor((currentDate.getTime() - dueDate.getTime()) / MS_PER_DAY)
}

const hasProofOfPaymentDocument = (documents = []) =>
  documents.some((document) => document?.documentType === 'proof_of_payment')

const isReminderEligiblePaymentStatus = (paymentStatus) => ['unpaid', 'overdue'].includes(paymentStatus)
const isTerminalCollectionInquiry = (inquiry) => TERMINAL_INQUIRY_STATUSES.includes(inquiry?.status)

const isSameWeek = (date, now) => {
  const currentDate = toDate(now) ?? new Date()
  const targetDate = toDate(date)

  if (!targetDate) {
    return false
  }

  const startOfWeek = new Date(currentDate)
  startOfWeek.setUTCHours(0, 0, 0, 0)
  startOfWeek.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay())

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7)

  return targetDate >= startOfWeek && targetDate < endOfWeek
}

const countByPaymentStatus = (inquiries, paymentStatus) =>
  countMatchingInquiries(
    inquiries,
    (inquiry) => !isTerminalCollectionInquiry(inquiry) && inquiry?.paymentStatus === paymentStatus,
  )

const countPaidThisWeek = (inquiries, now) =>
  countMatchingInquiries(
    inquiries,
    (inquiry) =>
      inquiry?.paymentStatus === 'paid' && isSameWeek(inquiry?.paidAt ?? inquiry?.updatedAt, now),
  )

export function getCollectionsActionState(inquiry, { now } = {}) {
  if (isTerminalCollectionInquiry(inquiry)) {
    return {
      canSendPaymentReminder: false,
      canReviewProofOfPayment: false,
      canMarkAsPaid: false,
    }
  }

  const paymentStatus = inquiry?.paymentStatus ?? ''
  const hasProofOfPayment = hasProofOfPaymentDocument(inquiry?.documents ?? [])
  const daysOverdue = getDaysOverdue(inquiry?.paymentDueAt, now)

  return {
    canSendPaymentReminder:
      paymentStatus !== 'paid' &&
      (isReminderEligiblePaymentStatus(paymentStatus) || (paymentStatus === 'unpaid' && daysOverdue > 0)),
    canReviewProofOfPayment: hasProofOfPayment && ['proof_submitted', 'verifying'].includes(paymentStatus),
    canMarkAsPaid: hasProofOfPayment && paymentStatus === 'verifying',
  }
}

export function buildCollectionsTableRow(inquiry, { now } = {}) {
  return {
    key: inquiry?.id ?? '',
    customer: inquiry?.customerDisplayName || 'Unknown customer',
    vehicle: inquiry?.vehicleLabel || 'Unknown vehicle',
    status: formatStatusLabel(inquiry?.status),
    paymentStatus: formatStatusLabel(inquiry?.paymentStatus),
    paymentDueAt: inquiry?.paymentDueAt ?? null,
    daysOverdue: getDaysOverdue(inquiry?.paymentDueAt, now),
    hasProofOfPayment: hasProofOfPaymentDocument(inquiry?.documents ?? []),
  }
}

export function buildCollectionsUpdateDraft(inquiry = {}) {
  return {
    status: inquiry?.status ?? 'payment_pending',
    paymentStatus: inquiry?.paymentStatus ?? 'unpaid',
    paymentDueAt: toDateInputValue(inquiry?.paymentDueAt),
    reviewNotes: typeof inquiry?.reviewNotes === 'string' ? inquiry.reviewNotes : '',
  }
}

export function filterCollectionsItems(collectionItems = [], { filters = {} } = {}) {
  const searchNeedle = String(filters.search ?? '').trim().toLowerCase()

  return collectionItems.filter(({ inquiry, row }) => {
    if (filters.paymentStatus && filters.paymentStatus !== 'all' && inquiry?.paymentStatus !== filters.paymentStatus) {
      return false
    }

    if (filters.overdueOnly && row.daysOverdue < 1) {
      return false
    }

    if (filters.hasProof === 'with_proof' && !row.hasProofOfPayment) {
      return false
    }

    if (filters.hasProof === 'without_proof' && row.hasProofOfPayment) {
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

const describeCollectionsPaymentFilter = (paymentStatus) => {
  if (!paymentStatus || paymentStatus === 'all') {
    return 'all payment states'
  }

  return `${formatStatusLabel(paymentStatus).toLowerCase()} cases`
}

const describeProofFilter = (hasProof) => {
  if (hasProof === 'with_proof') {
    return 'with proof'
  }

  if (hasProof === 'without_proof') {
    return 'without proof'
  }

  return null
}

export function getCollectionsFilterSummary({ filters = {}, visibleCount = 0, totalCount = 0 } = {}) {
  const descriptors = [describeCollectionsPaymentFilter(filters.paymentStatus)]

  if (filters.overdueOnly) {
    descriptors.push('overdue only')
  }

  const proofDescriptor = describeProofFilter(filters.hasProof)
  if (proofDescriptor) {
    descriptors.push(proofDescriptor)
  }

  const trimmedSearch = String(filters.search ?? '').trim()
  if (trimmedSearch) {
    descriptors.push(`matching "${trimmedSearch}"`)
  }

  const hiddenCount = Math.max(totalCount - visibleCount, 0)
  const tone = filters.overdueOnly || filters.paymentStatus === 'overdue' ? 'urgent' : visibleCount ? 'focused' : 'empty'
  const noun = visibleCount === 1 ? 'case' : 'cases'
  const hiddenCopy =
    hiddenCount > 0 ? ` ${hiddenCount} other ${hiddenCount === 1 ? 'case is' : 'cases are'} hidden by the current filters.` : ''

  return {
    tone,
    title: `${visibleCount} collections ${noun} in focus`,
    detail: `Showing ${descriptors.join(', ')}.${hiddenCopy}`.trim(),
  }
}

export function getCollectionsSummaryCards({ inquiries = [], now } = {}) {
  return [
    {
      label: 'Unpaid',
      value: countByPaymentStatus(inquiries, 'unpaid'),
      sub: 'Cases still waiting for payment',
    },
    {
      label: 'Proof Submitted',
      value: countByPaymentStatus(inquiries, 'proof_submitted'),
      sub: 'Cases with proof ready for review',
    },
    {
      label: 'Verifying',
      value: countByPaymentStatus(inquiries, 'verifying'),
      sub: 'Cases under payment validation',
    },
    {
      label: 'Overdue',
      value: countByPaymentStatus(inquiries, 'overdue'),
      sub: 'Cases past the payment deadline',
    },
    {
      label: 'Paid This Week',
      value: countPaidThisWeek(inquiries, now),
      sub: 'Payments confirmed this week',
    },
  ]
}
