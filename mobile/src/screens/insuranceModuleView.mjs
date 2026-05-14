const titleCase = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

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

const buildChecklistGroup = (documentTypes, uploadedTypes) =>
  documentTypes.map((documentType) => ({
    ...documentType,
    complete: hasUploadedType(uploadedTypes, documentType.type),
  }))

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

export const getCustomerInsuranceTimeline = ({ status = 'submitted' } = {}) => {
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

  const finalStepByStatus = {
    needs_documents: 'documents',
    for_approval: 'approval',
    approved: 'approved',
    payment_pending: 'payment',
    active: 'approved',
    for_renewal: 'renewal',
    closed: 'closed',
    rejected: 'rejected',
  }

  const finalStepKey = finalStepByStatus[status]

  if (finalStepKey) {
    timeline.push({
      key: finalStepKey,
      label: titleCase(finalStepKey),
      state: 'current',
    })
  }

  if (status === 'for_renewal') {
    timeline.splice(2, 0, {
      key: 'payment',
      label: 'Payment',
      state: 'done',
    })
  }

  return timeline
}
