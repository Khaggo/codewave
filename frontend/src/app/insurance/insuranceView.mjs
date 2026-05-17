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
const BROADCAST_TARGET_MODES = ['selected_cases', 'filtered_results']
const TARGET_MODE_LABELS = {
  single_case: 'Single Case',
  selected_cases: 'Selected Cases',
  filtered_results: 'Filtered Results',
}

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

const pluralize = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`

const isTerminalInquiry = (inquiry) => TERMINAL_INQUIRY_STATUSES.includes(inquiry?.status)

const INSURANCE_DOCUMENT_LABELS = Object.freeze({
  or_cr: 'OR/CR',
  policy: 'Policy copy',
  valid_id: 'Valid ID',
  police_report: 'Police report',
  photo: 'Damage photo',
  estimate: 'Repair estimate',
  proof_of_payment: 'Proof of payment',
  other: 'Other document',
})

const PURPOSE_REQUIRED_DOCUMENTS = Object.freeze({
  renewal: [
    { type: 'or_cr', label: 'OR/CR' },
    { type: 'policy', label: 'Old policy' },
  ],
  new_application: [{ type: 'or_cr', label: 'OR/CR' }],
  claim: [{ type: 'or_cr', label: 'OR/CR' }],
  quotation: [{ type: 'or_cr', label: 'OR/CR' }],
})

const PURPOSE_SUPPORTING_DOCUMENTS = Object.freeze({
  renewal: [
    { type: 'estimate', label: 'Renewal quote notes' },
    { type: 'other', label: 'Other document' },
  ],
  new_application: [
    { type: 'policy', label: 'Old policy (if available)' },
    { type: 'estimate', label: 'Quotation or estimate' },
    { type: 'other', label: 'Other document' },
  ],
  claim: [
    { type: 'policy', label: 'Policy copy' },
    { type: 'photo', label: 'Damage photo' },
    { type: 'estimate', label: 'Repair estimate' },
    { type: 'police_report', label: 'Police report (if requested)' },
    { type: 'other', label: 'Other claim document' },
  ],
  quotation: [
    { type: 'policy', label: 'Policy copy (if available)' },
    { type: 'estimate', label: 'Existing estimate' },
    { type: 'other', label: 'Other document' },
  ],
})

export const shouldIncludeInsuranceInquiryInLiveQueue = ({
  inquiry = null,
  statusFilter = 'all',
} = {}) => {
  if (!inquiry?.id) {
    return false
  }

  const normalizedStatusFilter = String(statusFilter ?? '').trim() || 'all'

  if (normalizedStatusFilter !== 'all') {
    return inquiry.status === normalizedStatusFilter
  }

  return !isTerminalInquiry(inquiry)
}

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

export function getInsuranceReviewStepNote(inquiry) {
  const status = inquiry?.status ?? 'submitted'
  const documentStatus = inquiry?.documentStatus ?? 'incomplete'

  switch (status) {
    case 'submitted':
      return 'Waiting for staff review'
    case 'needs_documents':
      return 'Needs documents'
    case 'under_review':
      return documentStatus === 'complete'
        ? 'Documents complete'
        : `Documents ${formatStatusLabel(documentStatus)}`
    case 'for_approval':
      return 'Ready for approval'
    case 'approved':
    case 'payment_pending':
    case 'active':
    case 'for_renewal':
    case 'closed':
      return 'Completed'
    case 'cancelled':
    case 'rejected':
      return formatStatusLabel(status)
    default:
      return formatStatusLabel(documentStatus)
  }
}

export function buildInsuranceDocumentReviewState(inquiry = null) {
  const purpose = inquiry?.purpose ?? 'quotation'
  const documents = Array.isArray(inquiry?.documents) ? inquiry.documents : []
  const uploadedTypes = new Set(documents.map((document) => document?.documentType).filter(Boolean))
  const requiredItems = (PURPOSE_REQUIRED_DOCUMENTS[purpose] ?? PURPOSE_REQUIRED_DOCUMENTS.quotation).map((item) => ({
    ...item,
    complete: uploadedTypes.has(item.type),
  }))
  const supportingItems = (PURPOSE_SUPPORTING_DOCUMENTS[purpose] ?? []).map((item) => ({
    ...item,
    complete: uploadedTypes.has(item.type),
  }))
  const missingRequiredItems = requiredItems.filter((item) => !item.complete)
  const uncategorizedDocuments = documents.filter((document) => {
    const type = document?.documentType
    return !Object.prototype.hasOwnProperty.call(INSURANCE_DOCUMENT_LABELS, type ?? '')
  })

  return {
    requiredItems,
    supportingItems,
    missingRequiredItems,
    requiredReadyCount: requiredItems.filter((item) => item.complete).length,
    requiredTotalCount: requiredItems.length,
    allRequiredReady: requiredItems.every((item) => item.complete),
    uploadedCount: documents.length,
    uncategorizedDocuments,
  }
}

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

export function buildInsurancePrimaryFocus({
  selectedInquiry = null,
  selectedCount = 0,
  filteredCount = 0,
  activeFilterCount = 0,
} = {}) {
  if (selectedInquiry && isTerminalInquiry(selectedInquiry)) {
    return {
      title: 'Case is already terminal',
      description: 'Cancelled, rejected, and closed cases are view-only and do not stay in the live queue.',
      tone: 'neutral',
    }
  }

  if (selectedInquiry) {
    return {
      title: 'Case ready',
      description: 'You can now review details, update workflow, or send a targeted follow-up.',
      tone: 'ready',
    }
  }

  if (filteredCount > 0) {
    return {
      title: 'Pick a case first',
      description: 'Choose one case from the queue before sending reminders or editing workflow.',
      tone: activeFilterCount > 0 ? 'attention' : 'neutral',
    }
  }

  if (selectedCount > 0) {
    return {
      title: 'Selection waiting',
      description: 'Clear or refresh the queue to bring the selected cases back into view.',
      tone: 'neutral',
    }
  }

  return {
    title: 'Start with the queue',
    description: 'Use the filters to find the cases that need review, payment follow-up, or renewal work.',
    tone: 'neutral',
  }
}

export function buildInsuranceWorkspaceSections() {
  return {
    queue: {
      title: '1. Filter and pick a case',
      description: 'Narrow the live queue, then open the case you want to work on.',
    },
    detail: {
      title: '2. Review the selected case',
      description: 'Use the tabs to check documents, payment, renewal, and activity in one place.',
    },
    actions: {
      title: '3. Take the next action',
      description: 'Update workflow first, then send reminders or broadcasts only when needed.',
    },
  }
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
  const shouldPreserveDraft =
    sameInquiry &&
    currentUpdateState !== 'status_update_saved' &&
    areInsuranceUpdateDraftsEqual(currentUpdateDraft, nextDraft) === false

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

  if (!BROADCAST_TARGET_MODES.includes(normalizedTargetMode)) {
    throw new Error('Broadcast target mode must be selected_cases or filtered_results.')
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
  const parts = [
    sentCount === deduplicatedCustomerCount
      ? `Sent ${sentCount} broadcast(s) to ${deduplicatedCustomerCount} customer(s).`
      : `Sent ${sentCount} of ${deduplicatedCustomerCount} customer broadcast(s).`,
  ]

  if (skippedCount) {
    parts.push(`${skippedCount} inquiry result(s) skipped.`)
  }

  if (failedCount) {
    parts.push(`${failedCount} failed.`)
  }

  return parts.join(' ')
}

export function getInsuranceQueueFilterSummary({
  totalCount = 0,
  visibleCount = 0,
  filters = {},
} = {}) {
  const filterLabels = [
    filters?.status && filters.status !== 'all' ? formatStatusLabel(filters.status) : null,
    filters?.paymentStatus && filters.paymentStatus !== 'all' ? `${formatStatusLabel(filters.paymentStatus)} payment` : null,
    filters?.renewalStatus && filters.renewalStatus !== 'all' ? formatStatusLabel(filters.renewalStatus) : null,
  ].filter(Boolean)
  const trimmedSearch = String(filters?.search ?? '').trim()

  const detailParts = []

  if (filterLabels.length) {
    detailParts.push(`Server filters: ${filterLabels.join(', ')}.`)
  }

  if (trimmedSearch) {
    detailParts.push(`Search: “${trimmedSearch}”.`)
  }

  return {
    headline: `Showing ${visibleCount} of ${totalCount} live ${totalCount === 1 ? 'case' : 'cases'}`,
    detail: detailParts.length ? detailParts.join(' ') : 'All open insurance cases are currently in view.',
    hasActiveFilters: Boolean(filterLabels.length || trimmedSearch),
  }
}

export function getInsuranceReminderComposerState({
  targetMode = 'selected_cases',
  selectedInquiryId = '',
  selectedInquiryIds = [],
  selectedVisibleInquiryIds = [],
  filteredCount = 0,
} = {}) {
  const normalizedTargetMode = String(targetMode ?? '').trim() || 'selected_cases'
  const selectedCount = normalizeSelectedInsuranceIds(selectedInquiryIds).length
  const visibleSelectedCount = normalizeSelectedInsuranceIds(selectedVisibleInquiryIds).length

  if (normalizedTargetMode === 'single_case') {
    return {
      audienceLabel: selectedInquiryId ? 'Current case' : 'No case selected',
      scopeLabel: TARGET_MODE_LABELS.single_case,
      readinessLabel: selectedInquiryId ? 'Ready for the current case.' : 'Select a case to send a reminder.',
      summaryLabel: selectedInquiryId ? 'Ready for the current case.' : 'Select a case to send a reminder.',
      canSend: Boolean(selectedInquiryId),
    }
  }

  if (normalizedTargetMode === 'filtered_results') {
    return {
      audienceLabel: `${pluralize(filteredCount, 'filtered case')}`,
      scopeLabel: TARGET_MODE_LABELS.filtered_results,
      readinessLabel: filteredCount ? 'Ready for filtered cases.' : 'Keep at least 1 case in view.',
      summaryLabel: filteredCount ? 'Ready for filtered cases.' : 'Keep at least 1 case in view.',
      canSend: filteredCount > 0,
    }
  }

  return {
    audienceLabel: `${pluralize(selectedCount, 'selected case')}`,
    scopeLabel: `${visibleSelectedCount} selected in the current queue`,
    readinessLabel: selectedCount ? 'Ready for selected cases.' : 'Select at least 1 case.',
    summaryLabel: selectedCount ? 'Ready for selected cases.' : 'Select at least 1 case.',
    canSend: selectedCount > 0,
  }
}

export function getInsuranceBroadcastComposerState({
  targetMode = 'selected_cases',
  selectedInquiryIds = [],
  filteredCount = 0,
  title = '',
  message = '',
} = {}) {
  const normalizedTargetMode = String(targetMode ?? '').trim() || 'selected_cases'
  const selectedCount = normalizeSelectedInsuranceIds(selectedInquiryIds).length
  const hasTitle = Boolean(String(title ?? '').trim())
  const hasMessage = Boolean(String(message ?? '').trim())

  if (normalizedTargetMode === 'filtered_results') {
    const hasAudience = filteredCount > 0
    const summaryLabel =
      hasAudience && hasTitle && hasMessage
        ? 'Ready for filtered cases.'
        : !hasAudience
          ? 'Keep at least 1 case in view.'
          : !hasTitle
            ? 'Add a title.'
            : 'Add a message.'

    return {
      audienceLabel: `${pluralize(filteredCount, 'filtered case')}`,
      scopeLabel: TARGET_MODE_LABELS.filtered_results,
      readinessLabel: summaryLabel,
      summaryLabel,
      canSend: hasAudience && hasTitle && hasMessage,
    }
  }

  const summaryLabel =
    selectedCount && hasTitle && hasMessage
      ? 'Ready for selected cases.'
      : !selectedCount
        ? 'Select at least 1 case.'
        : !hasTitle
          ? 'Add a title.'
          : 'Add a message.'

  return {
    audienceLabel: `${pluralize(selectedCount, 'selected case')}`,
    scopeLabel: TARGET_MODE_LABELS.selected_cases,
    readinessLabel: summaryLabel,
    summaryLabel,
    canSend: selectedCount > 0 && hasTitle && hasMessage,
  }
}
