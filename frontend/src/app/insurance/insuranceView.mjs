export function formatStatusLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const TERMINAL_INQUIRY_STATUSES = ['closed', 'cancelled', 'rejected']
const EDITABLE_WORKFLOW_FIELDS = ['status', 'reviewNotes']
const REMINDER_FILTER_FIELDS = ['purpose', 'status', 'paymentStatus', 'renewalStatus']

const normalizeMeaningfulInsuranceFilters = (filters = {}, allowedFields = REMINDER_FILTER_FIELDS) =>
  allowedFields.reduce((result, field) => {
    const rawValue = String(filters?.[field] ?? '').trim()

    if (rawValue && rawValue !== 'all') {
      result[field] = rawValue
    }

    return result
  }, {})

const normalizeSelectedInsuranceIds = (selectedIds = []) =>
  [...new Set(selectedIds.map((value) => String(value ?? '').trim()).filter(Boolean))]

const isTerminalInquiry = (inquiry) => TERMINAL_INQUIRY_STATUSES.includes(inquiry?.status)

const countMatchingInquiries = (inquiries, predicate) =>
  inquiries.reduce((total, inquiry) => (predicate(inquiry) ? total + 1 : total), 0)

const buildInsuranceUpdateDraft = (inquiry, nextStatuses = []) => ({
  status: nextStatuses[0] ?? inquiry?.status ?? 'submitted',
  reviewNotes: inquiry?.reviewNotes ?? '',
})

const areInsuranceUpdateDraftsEqual = (left = {}, right = {}) =>
  EDITABLE_WORKFLOW_FIELDS.every((field) => String(left?.[field] ?? '') === String(right?.[field] ?? ''))

const buildLifecycleSummaryCards = (inquiries) => [
  {
    label: 'New Inquiries',
    value: countMatchingInquiries(inquiries, (inquiry) => inquiry?.status === 'submitted'),
    sub: 'Fresh customer intake waiting for review',
  },
  {
    label: 'Payment Pending',
    value: countMatchingInquiries(
      inquiries,
      (inquiry) =>
        !isTerminalInquiry(inquiry) &&
        (inquiry?.status === 'payment_pending' ||
          ['proof_submitted', 'verifying', 'overdue', 'unpaid'].includes(inquiry?.paymentStatus)),
    ),
    sub: 'Cases needing payment follow-up',
  },
  {
    label: 'For Renewal',
    value: countMatchingInquiries(
      inquiries,
      (inquiry) =>
        !isTerminalInquiry(inquiry) &&
        (inquiry?.status === 'for_renewal' ||
          ['upcoming', 'quoted', 'awaiting_customer', 'expired'].includes(inquiry?.renewalStatus)),
    ),
    sub: 'Cases due for renewal follow-up',
  },
  {
    label: 'Needs Documents',
    value: countMatchingInquiries(inquiries, (inquiry) => inquiry?.status === 'needs_documents'),
    sub: 'Cases waiting on document completion',
  },
]

export function buildInsuranceTableRow(inquiry) {
  return {
    key: inquiry?.id ?? '',
    customer: inquiry?.customerDisplayName || 'Unknown customer',
    vehicle: inquiry?.vehicleLabel || 'Unknown vehicle',
    status: formatStatusLabel(inquiry?.status),
    documentStatus: formatStatusLabel(inquiry?.documentStatus),
    paymentStatus: formatStatusLabel(inquiry?.paymentStatus),
    ...(inquiry?.renewalStatus
      ? {
          renewalStatus: formatStatusLabel(inquiry.renewalStatus),
        }
      : {}),
  }
}

export function getInsuranceSummaryCards(input = {}) {
  if (Array.isArray(input.inquiries)) {
    return buildLifecycleSummaryCards(input.inquiries)
  }

  const { queueItems = [], queueState, activeInquiry } = input

  return [
    {
      label: 'Review Queue',
      value: queueItems.length,
      sub: queueState === 'queue_loaded' ? 'Queue items loaded' : 'Manual inquiry lookup for now',
    },
    {
      label: 'Allowed Roles',
      value: '2',
      sub: 'service adviser, super admin',
    },
    {
      label: 'Selected Inquiry',
      value: activeInquiry ? formatStatusLabel(activeInquiry.status) : 'None',
      sub: activeInquiry ? activeInquiry.subject : 'Pick a queue item or enter an inquiry id',
    },
    {
      label: 'Editable Fields',
      value: String(EDITABLE_WORKFLOW_FIELDS.length),
      sub: 'status and review notes only',
    },
  ]
}

export function getInsuranceDetailTabs() {
  return [
    {
      key: 'overview',
      label: 'Overview',
    },
    {
      key: 'documents',
      label: 'Documents',
    },
    {
      key: 'timeline',
      label: 'Timeline',
    },
    {
      key: 'payment',
      label: 'Payment',
    },
    {
      key: 'renewal',
      label: 'Renewal',
    },
    {
      key: 'activity',
      label: 'Activity',
    },
  ]
}

export function getNextInsuranceWorkspaceViewState({
  currentActiveDetailTab,
  currentDetailMessage,
  currentDetailState,
  currentUpdateDraft,
  currentUpdateMessage,
  currentUpdateState,
  detailTabs = getInsuranceDetailTabs(),
  nextInquiry,
  nextStatuses = [],
  previousInquiryId,
} = {}) {
  const defaultTabKey = detailTabs[0]?.key ?? 'overview'
  const nextDraft = buildInsuranceUpdateDraft(nextInquiry, nextStatuses)
  const sameInquiry = Boolean(nextInquiry?.id) && nextInquiry.id === previousInquiryId
  const shouldPreserveDraft = sameInquiry && areInsuranceUpdateDraftsEqual(currentUpdateDraft, nextDraft) === false

  if (sameInquiry) {
    return {
      activeDetailTab: currentActiveDetailTab || defaultTabKey,
      detailMessage: currentDetailMessage ?? '',
      detailState: currentDetailState === 'idle' ? 'detail_loaded' : currentDetailState,
      updateDraft: shouldPreserveDraft ? currentUpdateDraft : nextDraft,
      updateMessage: currentUpdateMessage ?? '',
      updateState: currentUpdateState ?? 'status_update_ready',
    }
  }

  return {
    activeDetailTab: defaultTabKey,
    detailMessage: '',
    detailState: nextInquiry ? 'detail_loaded' : 'idle',
    updateDraft: nextDraft,
    updateMessage: '',
    updateState: 'status_update_ready',
  }
}

export function shouldApplyInsuranceAsyncResult({ requestInquiryId, selectedInquiryId } = {}) {
  return Boolean(requestInquiryId) && requestInquiryId === selectedInquiryId
}

export function buildInsuranceReminderRequest({
  reminderType,
  targetMode,
  selectedIds = [],
  filters = {},
} = {}) {
  const normalizedReminderType = String(reminderType ?? '').trim()
  const normalizedTargetMode = String(targetMode ?? '').trim()

  if (!normalizedReminderType || !normalizedTargetMode) {
    throw new Error('Reminder type and target mode are required before sending reminders.')
  }

  if (normalizedTargetMode === 'filtered_results') {
    const normalizedFilters = normalizeMeaningfulInsuranceFilters(filters)

    if (!Object.keys(normalizedFilters).length) {
      throw new Error('Choose at least one server-side insurance filter before sending filtered reminders.')
    }

    return {
      reminderType: normalizedReminderType,
      targetMode: normalizedTargetMode,
      filters: normalizedFilters,
    }
  }

  const normalizedSelectedIds = normalizeSelectedInsuranceIds(selectedIds)

  if (!normalizedSelectedIds.length) {
    throw new Error('Select at least one insurance case before sending reminders.')
  }

  if (normalizedTargetMode === 'single_case' && normalizedSelectedIds.length !== 1) {
    throw new Error('Single-case reminders require exactly one selected insurance case.')
  }

  return {
    reminderType: normalizedReminderType,
    targetMode: normalizedTargetMode,
    selectedIds: normalizedSelectedIds,
  }
}

export function buildInsuranceBroadcastRequest({
  targetMode,
  selectedIds = [],
  filters = {},
  title,
  message,
} = {}) {
  const normalizedTargetMode = String(targetMode ?? '').trim()
  const normalizedTitle = String(title ?? '').trim()
  const normalizedMessage = String(message ?? '').trim()

  if (!normalizedTitle || !normalizedMessage || !normalizedTargetMode) {
    throw new Error('Title, message, and target mode are required before sending broadcasts.')
  }

  if (normalizedTargetMode === 'filtered_results') {
    const normalizedFilters = normalizeMeaningfulInsuranceFilters(filters)

    if (!Object.keys(normalizedFilters).length) {
      throw new Error('Choose at least one server-side insurance filter before sending filtered broadcasts.')
    }

    return {
      targetMode: normalizedTargetMode,
      filters: normalizedFilters,
      title: normalizedTitle,
      message: normalizedMessage,
    }
  }

  const normalizedSelectedIds = normalizeSelectedInsuranceIds(selectedIds)

  if (!normalizedSelectedIds.length) {
    throw new Error('Select at least one insurance case before sending broadcasts.')
  }

  return {
    targetMode: normalizedTargetMode,
    selectedIds: normalizedSelectedIds,
    title: normalizedTitle,
    message: normalizedMessage,
  }
}

export function summarizeInsuranceReminderResult({
  sentCount = 0,
  skippedCount = 0,
  failedCount = 0,
} = {}) {
  const parts = [`Sent ${sentCount} reminder(s).`]

  if (skippedCount) {
    parts.push(`${skippedCount} skipped.`)
  }

  if (failedCount) {
    parts.push(`${failedCount} failed.`)
  }

  return parts.join(' ')
}

export function summarizeInsuranceBroadcastResult({
  sentCount = 0,
  skippedCount = 0,
  failedCount = 0,
  deduplicatedCustomerCount = 0,
} = {}) {
  const parts = [`Sent ${sentCount} broadcast(s) to ${deduplicatedCustomerCount} customer(s).`]

  if (skippedCount) {
    parts.push(`${skippedCount} inquiry result(s) skipped.`)
  }

  if (failedCount) {
    parts.push(`${failedCount} failed.`)
  }

  return parts.join(' ')
}
