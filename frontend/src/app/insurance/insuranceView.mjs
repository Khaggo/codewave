export function formatStatusLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const TERMINAL_INQUIRY_STATUSES = ['closed', 'cancelled', 'rejected']
const EDITABLE_WORKFLOW_FIELDS = [
  'status',
  'documentStatus',
  'paymentStatus',
  'renewalStatus',
  'paymentDueAt',
  'policyExpiryAt',
  'renewalDueAt',
  'assignedStaffId',
  'reviewNotes',
]

const isTerminalInquiry = (inquiry) => TERMINAL_INQUIRY_STATUSES.includes(inquiry?.status)

const countMatchingInquiries = (inquiries, predicate) =>
  inquiries.reduce((total, inquiry) => (predicate(inquiry) ? total + 1 : total), 0)

const toInputDateValue = (value) => {
  if (!value) return ''

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return parsedDate.toISOString().slice(0, 10)
}

const buildInsuranceUpdateDraft = (inquiry, nextStatuses = []) => ({
  status: nextStatuses[0] ?? inquiry?.status ?? 'submitted',
  documentStatus: inquiry?.documentStatus ?? 'incomplete',
  paymentStatus: inquiry?.paymentStatus ?? 'not_required',
  renewalStatus: inquiry?.renewalStatus ?? 'not_applicable',
  paymentDueAt: toInputDateValue(inquiry?.paymentDueAt),
  policyExpiryAt: toInputDateValue(inquiry?.policyExpiryAt),
  renewalDueAt: toInputDateValue(inquiry?.renewalDueAt),
  assignedStaffId: inquiry?.assignedStaffId ?? '',
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
      sub: 'status, workflow tags, assignee, due dates, and review notes',
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
