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

export const buildRequirementsChecklist = ({ status = 'submitted', uploadedTypes = [] } = {}) => {
  const normalizedUploadedTypes = Array.isArray(uploadedTypes) ? uploadedTypes : []

  return {
    status,
    required: buildChecklistGroup(REQUIRED_DOCUMENT_TYPES, normalizedUploadedTypes),
    optional: buildChecklistGroup(OPTIONAL_DOCUMENT_TYPES, normalizedUploadedTypes),
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
