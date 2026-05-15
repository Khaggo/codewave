const REQUIRED_DOCUMENT_TYPES = [
  { type: 'or_cr', label: 'OR/CR' },
  { type: 'policy', label: 'Policy copy' },
  { type: 'valid_id', label: 'Valid ID' },
]

const OPTIONAL_DOCUMENT_TYPES = [
  { type: 'photo', label: 'Damage photo' },
  { type: 'estimate', label: 'Repair estimate' },
  { type: 'police_report', label: 'Police report' },
  { type: 'proof_of_payment', label: 'Proof of payment' },
  { type: 'other', label: 'Other document' },
]

export const REMEMBERED_INSURANCE_INQUIRY_STORAGE_KEY =
  'codewave:insurance:remembered-inquiries'

const hasUploadedType = (uploadedTypes, type) => uploadedTypes.includes(type)
const rememberedInquiryIdsByVehicle = new Map()
const CUSTOMER_PAYMENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatFileSizeLabel = (size) => {
  if (!Number.isFinite(size) || size <= 0) {
    return null
  }

  if (size >= 1024 * 1024) {
    return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`
  }

  return `${Math.round(size / 1024)} KB`
}

const buildChecklistGroup = (documentTypes, uploadedTypes) =>
  documentTypes.map((documentType) => ({
    ...documentType,
    complete: hasUploadedType(uploadedTypes, documentType.type),
  }))

export const createPickedInsuranceDocumentDraft = ({
  documentType = 'photo',
  asset,
} = {}) => ({
  documentType,
  fileName: String(asset?.name ?? '').trim(),
  fileUri: String(asset?.uri ?? '').trim(),
  mimeType: String(asset?.mimeType ?? '').trim() || 'application/pdf',
  notes: '',
  fileSizeLabel: formatFileSizeLabel(asset?.size),
})

export const isTerminalCustomerInquiryStatus = (status) =>
  ['closed', 'rejected', 'cancelled'].includes(status)

export const shouldShowCustomerInsuranceFollowUp = ({
  status = 'submitted',
  paymentStatus = 'not_required',
  renewalStatus = 'not_applicable',
  followUpType,
} = {}) => {
  if (isTerminalCustomerInquiryStatus(status)) {
    return false
  }

  if (followUpType === 'payment') {
    return status === 'payment_pending' || paymentStatus !== 'not_required'
  }

  if (followUpType === 'renewal') {
    return status === 'for_renewal' || renewalStatus !== 'not_applicable'
  }

  return false
}

export const shouldDeferCustomerInsuranceTrackingRefresh = ({
  hasHydratedRememberedInquiryMappings = false,
  knownInquiryId,
  settledRememberedInquiryIdForSelectedVehicle,
} = {}) =>
  !String(knownInquiryId ?? '').trim() &&
  (!hasHydratedRememberedInquiryMappings ||
    settledRememberedInquiryIdForSelectedVehicle === undefined ||
    String(settledRememberedInquiryIdForSelectedVehicle ?? '').trim().length > 0)

export const getVehicleScopedCustomerInquiryId = ({
  selectedVehicleId,
  routeInquiryId,
  latestInquiryId,
  latestInquiryVehicleId,
  rememberedInquiryId,
} = {}) => {
  const normalizedRouteInquiryId = String(routeInquiryId ?? '').trim()

  if (normalizedRouteInquiryId) {
    return normalizedRouteInquiryId
  }

  const normalizedSelectedVehicleId = String(selectedVehicleId ?? '').trim()
  const normalizedLatestInquiryId = String(latestInquiryId ?? '').trim()
  const normalizedLatestInquiryVehicleId = String(latestInquiryVehicleId ?? '').trim()

  if (
    normalizedSelectedVehicleId &&
    normalizedLatestInquiryId &&
    normalizedLatestInquiryVehicleId === normalizedSelectedVehicleId
  ) {
    return normalizedLatestInquiryId
  }

  return rememberedInquiryId ?? null
}

export const doesCustomerInsuranceInquiryMatchVehicle = ({
  inquiry,
  vehicleId,
} = {}) => {
  const normalizedInquiryVehicleId = String(inquiry?.vehicleId ?? '').trim()
  const normalizedVehicleId = String(vehicleId ?? '').trim()

  if (!normalizedInquiryVehicleId || !normalizedVehicleId) {
    return false
  }

  return normalizedInquiryVehicleId === normalizedVehicleId
}

export const rememberInquiryForVehicle = ({ vehicleId, inquiryId } = {}) => {
  const normalizedVehicleId = String(vehicleId ?? '').trim()
  const normalizedInquiryId = String(inquiryId ?? '').trim()

  if (!normalizedVehicleId || !normalizedInquiryId) {
    return
  }

  rememberedInquiryIdsByVehicle.set(normalizedVehicleId, normalizedInquiryId)
}

export const getRememberedInquiryForVehicle = (vehicleId) => {
  const normalizedVehicleId = String(vehicleId ?? '').trim()

  if (!normalizedVehicleId) {
    return null
  }

  return rememberedInquiryIdsByVehicle.get(normalizedVehicleId) ?? null
}

export const clearRememberedInquiryForVehicle = (vehicleId) => {
  const normalizedVehicleId = String(vehicleId ?? '').trim()

  if (!normalizedVehicleId) {
    return
  }

  rememberedInquiryIdsByVehicle.delete(normalizedVehicleId)
}

export const serializeRememberedInquiryMappings = () =>
  JSON.stringify(Object.fromEntries(rememberedInquiryIdsByVehicle))

export const hydrateRememberedInquiryMappings = (serializedValue) => {
  rememberedInquiryIdsByVehicle.clear()

  if (!serializedValue) {
    return
  }

  const parsedValue =
    typeof serializedValue === 'string' ? JSON.parse(serializedValue) : serializedValue

  if (!parsedValue || typeof parsedValue !== 'object') {
    return
  }

  for (const [vehicleId, inquiryId] of Object.entries(parsedValue)) {
    rememberInquiryForVehicle({
      vehicleId,
      inquiryId,
    })
  }
}

export const getInsuranceHomeCards = ({ hasActiveRequest } = {}) => [
  { key: 'start', label: 'Start New Request' },
  { key: 'active', label: hasActiveRequest ? 'My Active Request' : 'No Active Request' },
  { key: 'documents', label: 'Upload Documents' },
  { key: 'payment', label: 'Payment' },
  { key: 'renewal', label: 'Renewal Reminder' },
  { key: 'history', label: 'History' },
]

const formatWorkflowLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || '--'

export const INSURANCE_PANEL_KEYS = Object.freeze({
  home: 'home',
  request: 'request',
  documents: 'documents',
  payment: 'payment',
  renewal: 'renewal',
  history: 'history',
})

export const INSURANCE_MODE_SECTION_KEYS = Object.freeze({
  overview: 'overview',
  request: 'request',
  documents: 'documents',
  status: 'status',
  history: 'history',
})

export const buildCustomerInsuranceHeroState = ({
  selectedVehicleLabel,
  latestInquiry = null,
  missingRequiredDocuments = [],
  claimStatusUpdateCount = 0,
} = {}) => {
  if (!latestInquiry?.id) {
    return {
      eyebrow: 'Insurance',
      title: 'Start a new request',
      message: selectedVehicleLabel
        ? 'Use the selected vehicle to open a customer-safe insurance request.'
        : 'Choose a vehicle before you start a customer-safe insurance request.',
      ctaLabel: 'Begin intake',
      routeKey: INSURANCE_PANEL_KEYS.request,
      statusLabel: selectedVehicleLabel ? 'Ready' : 'Vehicle needed',
      tone: selectedVehicleLabel ? 'default' : 'warning',
    }
  }

  const requiredCount = Array.isArray(missingRequiredDocuments)
    ? missingRequiredDocuments.length
    : 0

  if (requiredCount > 0) {
    return {
      eyebrow: 'Current request',
      title: 'Upload required documents',
      message: `${requiredCount} required document${requiredCount === 1 ? '' : 's'} still need attention for this request.`,
      ctaLabel: 'Open documents',
      routeKey: INSURANCE_PANEL_KEYS.documents,
      statusLabel: `${requiredCount} missing`,
      tone: 'warning',
    }
  }

  if (latestInquiry.status === 'payment_pending' || latestInquiry.paymentStatus === 'overdue') {
    return {
      eyebrow: 'Current request',
      title:
        latestInquiry.paymentStatus === 'overdue'
          ? 'Payment is overdue'
          : 'Review payment follow-up',
      message:
        latestInquiry.paymentStatus === 'overdue'
          ? 'Upload proof of payment or contact staff so the request can move forward.'
          : 'Payment proof has been submitted and is waiting for review.',
      ctaLabel: 'Open payment',
      routeKey: INSURANCE_PANEL_KEYS.payment,
      statusLabel: formatWorkflowLabel(latestInquiry.paymentStatus),
      tone: latestInquiry.paymentStatus === 'overdue' ? 'danger' : 'default',
    }
  }

  if (
    latestInquiry.status === 'for_renewal' ||
    latestInquiry.renewalStatus === 'awaiting_customer'
  ) {
    return {
      eyebrow: 'Current request',
      title: 'Review renewal follow-up',
      message: 'Renewal follow-up is active for this vehicle.',
      ctaLabel: 'Open renewal',
      routeKey: INSURANCE_PANEL_KEYS.renewal,
      statusLabel: formatWorkflowLabel(latestInquiry.renewalStatus),
      tone: 'default',
    }
  }

  return {
    eyebrow: 'Current request',
    title: 'Review current request',
    message:
      claimStatusUpdateCount > 0
        ? 'Your latest request and vehicle history are both ready to review.'
        : 'Your latest request is ready to review.',
    ctaLabel: 'Check status',
    routeKey: INSURANCE_PANEL_KEYS.history,
    statusLabel: formatWorkflowLabel(latestInquiry.status),
    tone: 'success',
  }
}

export const buildCustomerInsuranceEntryState = ({
  selectedVehicleLabel = '',
  latestInquiry = null,
  reminderCount = 0,
} = {}) => ({
  title: 'Protection center',
  summary: 'Open the dedicated insurance workspace for requests, documents, updates, and history.',
  vehicleLabel: selectedVehicleLabel || 'Choose a vehicle to continue',
  statusLabel: latestInquiry?.id
    ? formatWorkflowLabel(latestInquiry.status)
    : selectedVehicleLabel
    ? 'Ready'
    : 'Vehicle needed',
  ctaLabel: 'Enter insurance mode',
  reminderLabel:
    reminderCount > 0 ? `${reminderCount} reminder${reminderCount === 1 ? '' : 's'}` : 'No reminders',
  tone: selectedVehicleLabel ? 'default' : 'warning',
})

export const buildCustomerInsuranceOverviewState = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
} = {}) => {
  const missingCount = Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments.length : 0

  const primary = !latestInquiry?.id
    ? {
        title: 'Start your first insurance request',
        message: 'Use insurance mode to create a customer-safe request and track what happens next.',
        ctaLabel: 'Open request',
        routeKey: INSURANCE_MODE_SECTION_KEYS.request,
      }
    : missingCount > 0
      ? {
          title: 'Upload required documents',
          message: 'One required file is blocking review for this request.',
          ctaLabel: 'Open docs',
          routeKey: INSURANCE_MODE_SECTION_KEYS.documents,
        }
      : {
          title: 'Review current request',
          message: 'See the latest status, payment follow-up, or renewal update in one place.',
          ctaLabel: 'Open status',
          routeKey: INSURANCE_MODE_SECTION_KEYS.status,
        }

  return {
    ...primary,
    routeRows: [
      {
        key: INSURANCE_MODE_SECTION_KEYS.request,
        label: 'Request',
        helper: 'Review the request details and customer-safe notes.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.documents,
        label: 'Documents',
        helper: 'Upload the missing file and review what is already on file.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.status,
        label: 'Status',
        helper: 'See the current blocker, timeline, and latest update.',
      },
      {
        key: INSURANCE_MODE_SECTION_KEYS.history,
        label: 'History',
        helper: 'Past completed insurance records for this vehicle.',
      },
    ],
  }
}

export const buildCustomerInsuranceStatusState = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
  latestUpdateLabel = '--',
} = {}) => {
  const missingCount = Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments.length : 0
  const withLatestUpdateLabel = (state) =>
    Object.defineProperty(state, 'latestUpdateLabel', {
      value: latestUpdateLabel,
      enumerable: false,
      configurable: true,
      writable: true,
    })

  if (missingCount > 0) {
    return withLatestUpdateLabel({
      title: 'Documents needed',
      summary: 'Documents are the current blocker for this request.',
      ctaLabel: 'Open docs',
      ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.documents,
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents needed', active: true },
        { key: 'payment', label: 'Payment follow-up', active: false },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    })
  }

  if (latestInquiry?.paymentStatus && latestInquiry.paymentStatus !== 'not_required') {
    return withLatestUpdateLabel({
      title: 'Payment follow-up',
      summary: 'Payment is the current blocker for this request.',
      ctaLabel: 'Review payment',
      ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.status,
      timeline: [
        { key: 'request', label: 'Request submitted', active: true },
        { key: 'documents', label: 'Documents complete', active: true },
        { key: 'payment', label: 'Payment follow-up', active: true },
        { key: 'renewal', label: 'Renewal', active: false },
      ],
    })
  }

  return withLatestUpdateLabel({
    title: 'Current request status',
    summary: 'Review the latest customer-safe update and next step.',
    ctaLabel: 'Review status',
    ctaRouteKey: INSURANCE_MODE_SECTION_KEYS.status,
    timeline: [
      { key: 'request', label: 'Request submitted', active: true },
      { key: 'documents', label: 'Documents complete', active: true },
      { key: 'payment', label: 'Payment follow-up', active: false },
      { key: 'renewal', label: 'Renewal', active: false },
    ],
  })
}

export const buildCustomerInsuranceActionCards = ({
  latestInquiry = null,
  requirementsChecklist = { required: [], optional: [] },
  claimStatusUpdateCount = 0,
  paymentSummary = null,
  renewalSummary = null,
} = {}) => {
  const requiredItems = Array.isArray(requirementsChecklist.required)
    ? requirementsChecklist.required
    : []
  const completedRequiredCount = requiredItems.filter((item) => item.complete).length
  const totalRequiredCount = requiredItems.length

  return [
    {
      key: 'documents',
      title: 'Documents',
      routeKey: INSURANCE_PANEL_KEYS.documents,
      value: `${completedRequiredCount}/${totalRequiredCount || 0}`,
      description:
        !latestInquiry?.id && totalRequiredCount === 0
          ? 'Start a request to see what documents will be required.'
          : totalRequiredCount > completedRequiredCount
          ? 'See what is still missing and upload when ready.'
          : 'Required files are complete. You can still add more later.',
    },
    {
      key: 'payment',
      title: 'Payment',
      routeKey: INSURANCE_PANEL_KEYS.payment,
      value: latestInquiry ? formatWorkflowLabel(latestInquiry.paymentStatus) : 'Not required',
      description: paymentSummary?.message ?? 'Payment follow-up will appear here when needed.',
    },
    {
      key: 'renewal',
      title: 'Renewal',
      routeKey: INSURANCE_PANEL_KEYS.renewal,
      value: latestInquiry ? formatWorkflowLabel(latestInquiry.renewalStatus) : 'Not applicable',
      description: renewalSummary?.message ?? 'Renewal follow-up will appear here when needed.',
    },
    {
      key: 'history',
      title: 'History',
      routeKey: INSURANCE_PANEL_KEYS.history,
      value: String(claimStatusUpdateCount),
      description:
        claimStatusUpdateCount > 0
          ? 'Past insurance records are ready to review.'
          : 'Past insurance records will appear here after staff close and record them.',
    },
  ]
}

export const buildCustomerInsuranceHomeFocus = ({
  latestInquiry = null,
  missingRequiredDocuments = [],
  claimStatusUpdateCount = 0,
} = {}) => {
  if (!latestInquiry?.id) {
    if (claimStatusUpdateCount > 0) {
      return {
        icon: 'history',
        title: 'Insurance history available',
        message: `${claimStatusUpdateCount} recorded insurance update${claimStatusUpdateCount === 1 ? '' : 's'} ${claimStatusUpdateCount === 1 ? 'is' : 'are'} already available for this vehicle.`,
        actionLabel: 'Review history',
        tone: 'default',
        highlightedCardKey: 'history',
      }
    }

    return {
      icon: 'shield-plus-outline',
      title: 'Start a fresh request',
      message: 'Begin with a short concern summary, then use this same screen to upload documents and track the workflow.',
      actionLabel: 'Start now',
      tone: 'default',
      highlightedCardKey: 'start',
    }
  }

  const requiredCount = Array.isArray(missingRequiredDocuments)
    ? missingRequiredDocuments.length
    : 0

  if (requiredCount > 0) {
    return {
      icon: 'file-document-alert-outline',
      title: 'Upload required documents',
      message: `${requiredCount} required document${requiredCount === 1 ? '' : 's'} still need attention before the review can continue.`,
      actionLabel: 'Upload now',
      tone: 'warning',
      highlightedCardKey: 'documents',
    }
  }

  if (latestInquiry?.status === 'payment_pending' || latestInquiry?.paymentStatus === 'overdue') {
    return {
      icon: 'cash-clock',
      title: latestInquiry?.paymentStatus === 'overdue' ? 'Payment is overdue' : 'Payment follow-up is active',
      message:
        latestInquiry?.paymentStatus === 'overdue'
          ? 'Upload your proof of payment as soon as possible so staff can continue the request.'
          : 'Proof of payment or verification is still part of the current request.',
      actionLabel: 'Review payment',
      tone: latestInquiry?.paymentStatus === 'overdue' ? 'danger' : 'default',
      highlightedCardKey: 'payment',
    }
  }

  if (latestInquiry?.status === 'for_renewal' || latestInquiry?.renewalStatus === 'awaiting_customer') {
    return {
      icon: 'calendar-clock-outline',
      title: 'Renewal follow-up is active',
      message: 'A renewal prompt is already in progress for this vehicle, so watch the latest timeline update closely.',
      actionLabel: 'Review renewal',
      tone: 'default',
      highlightedCardKey: 'renewal',
    }
  }

  return {
    icon: 'clipboard-check-outline',
    title: 'Current request in view',
    message: 'This home screen is already synced to your latest inquiry, timeline, and upload steps.',
    actionLabel: 'Refresh status',
    tone: 'success',
    highlightedCardKey: 'active',
  }
}

export const buildRequirementsChecklist = ({ status = 'submitted', uploadedTypes = [] } = {}) => {
  const normalizedUploadedTypes = Array.isArray(uploadedTypes) ? uploadedTypes : []

  return {
    status,
    required: buildChecklistGroup(REQUIRED_DOCUMENT_TYPES, normalizedUploadedTypes),
    optional: buildChecklistGroup(OPTIONAL_DOCUMENT_TYPES, normalizedUploadedTypes),
  }
}

const getDaysOverdue = ({ paymentDueAt, now = new Date().toISOString() } = {}) => {
  if (!paymentDueAt) {
    return 0
  }

  const dueDate = new Date(paymentDueAt)
  const nowDate = new Date(now)

  if (Number.isNaN(dueDate.getTime()) || Number.isNaN(nowDate.getTime())) {
    return 0
  }

  const diffMs = nowDate.getTime() - dueDate.getTime()

  if (diffMs <= 0) {
    return 0
  }

  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const formatCustomerPaymentDueDate = (paymentDueAt) => {
  if (!paymentDueAt) {
    return null
  }

  const dueDate = new Date(paymentDueAt)

  if (Number.isNaN(dueDate.getTime())) {
    return null
  }

  return CUSTOMER_PAYMENT_DATE_FORMATTER.format(dueDate)
}

const appendDueDateCopy = (message, paymentDueAt) => {
  const dueDateLabel = formatCustomerPaymentDueDate(paymentDueAt)

  if (!dueDateLabel) {
    return message
  }

  return `${message} Due date: ${dueDateLabel}.`
}

export const getCustomerInsurancePaymentSummary = ({
  status = 'submitted',
  paymentStatus = 'not_required',
  paymentDueAt = null,
  now = new Date().toISOString(),
} = {}) => {
  const daysOverdue = getDaysOverdue({ paymentDueAt, now })
  const dueDateLabel = formatCustomerPaymentDueDate(paymentDueAt)

  switch (paymentStatus) {
    case 'proof_submitted':
      return {
        title: 'Proof submitted',
        message: appendDueDateCopy(
          'Your proof of payment is on file. Staff still need to verify it before the request moves forward.',
          paymentDueAt,
        ),
        tone: 'default',
      }
    case 'verifying':
      return {
        title: 'Payment under verification',
        message: appendDueDateCopy(
          'Staff are reviewing your payment proof now. Keep the receipt available in case they request a clearer copy.',
          paymentDueAt,
        ),
        tone: 'default',
      }
    case 'paid':
      return {
        title: 'Payment received',
        message: 'Payment is already tagged as paid. You can still refresh the request if you are waiting for the next status update.',
        tone: 'success',
      }
    case 'overdue':
      return {
        title: 'Payment overdue',
        message:
          daysOverdue > 0
            ? `This request is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue for payment. Upload proof after payment or contact staff for help.`
            : 'This request is overdue for payment. Upload proof after payment or contact staff for help.',
        tone: 'danger',
      }
    default:
      return {
        title: 'Payment follow-up',
        message: dueDateLabel
          ? `Payment is being tracked for this request. Due date: ${dueDateLabel}.`
          : 'Payment instructions will appear here when staff tag the request for follow-up.',
        tone: status === 'payment_pending' ? 'default' : 'success',
      }
  }
}

export const getCustomerInsuranceTimeline = ({
  status = 'submitted',
  paymentStatus = 'not_required',
  renewalStatus = 'not_applicable',
} = {}) => {
  const timeline = [
    {
      key: 'submitted',
      label: 'Submitted',
      state: 'done',
    },
  ]

  if (status === 'submitted') {
    return timeline
  }

  if (status === 'cancelled') {
    return [
      ...timeline,
      {
        key: 'cancelled',
        label: 'Cancelled',
        state: 'current',
      },
    ]
  }

  timeline.push({
    key: 'review',
    label: 'In Review',
    state: status === 'under_review' ? 'current' : 'done',
  })

  switch (status) {
    case 'needs_documents':
      timeline.push({
        key: 'documents',
        label: 'Documents',
        state: 'current',
      })
      break
    case 'for_approval':
      timeline.push({
        key: 'approval',
        label: 'Approval',
        state: 'current',
      })
      break
    case 'approved':
      timeline.push({
        key: 'approved',
        label: 'Approved',
        state: 'current',
      })
      break
    case 'payment_pending':
      timeline.push({
        key: 'payment',
        label: 'Payment',
        state: 'current',
      })
      break
    case 'active':
      if (paymentStatus !== 'not_required') {
        timeline.push({
          key: 'payment',
          label: 'Payment',
          state: 'done',
        })
      }
      timeline.push({
        key: 'active',
        label: 'Active',
        state: 'current',
      })
      break
    case 'for_renewal':
      timeline.push({
        key: 'payment',
        label: 'Payment',
        state: 'done',
      })
      timeline.push({
        key: 'renewal',
        label: 'Renewal',
        state: 'current',
      })
      break
    case 'closed':
      timeline.push({
        key: 'closed',
        label: 'Closed',
        state: 'current',
      })
      break
    case 'rejected':
      timeline.push({
        key: 'rejected',
        label: 'Rejected',
        state: 'current',
      })
      break
    default:
      break
  }

  const hasPaymentStep = timeline.some((step) => step.key === 'payment')
  if (
    !hasPaymentStep &&
    !isTerminalCustomerInquiryStatus(status) &&
    ['proof_submitted', 'verifying', 'paid'].includes(paymentStatus)
  ) {
    timeline.push({
      key: 'payment',
      label: 'Payment',
      state: paymentStatus === 'paid' ? 'done' : 'current',
    })
  }

  const hasRenewalStep = timeline.some((step) => step.key === 'renewal')
  const shouldShowRenewalPrompt =
    shouldShowCustomerInsuranceFollowUp({
      status,
      paymentStatus,
      renewalStatus,
      followUpType: 'renewal',
    }) &&
    !hasRenewalStep &&
    status !== 'submitted'

  if (shouldShowRenewalPrompt) {
    timeline.push({
      key: 'renewal',
      label: 'Renewal',
      state: 'upcoming',
    })
  }

  return timeline
}
