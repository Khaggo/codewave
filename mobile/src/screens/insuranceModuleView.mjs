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

const hasUploadedType = (uploadedTypes, type) => uploadedTypes.includes(type)

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
  if (!hasPaymentStep && ['proof_submitted', 'verifying', 'paid'].includes(paymentStatus)) {
    timeline.push({
      key: 'payment',
      label: 'Payment',
      state: paymentStatus === 'paid' ? 'done' : 'current',
    })
  }

  const hasRenewalStep = timeline.some((step) => step.key === 'renewal')
  const shouldShowRenewalPrompt =
    renewalStatus !== 'not_applicable' &&
    !hasRenewalStep &&
    !['submitted', 'cancelled', 'rejected', 'closed'].includes(status)

  if (shouldShowRenewalPrompt) {
    timeline.push({
      key: 'renewal',
      label: 'Renewal',
      state: 'upcoming',
    })
  }

  return timeline
}
