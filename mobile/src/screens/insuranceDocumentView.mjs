const REQUIRED_DOCUMENT_TYPES = [
  { type: 'or_cr', label: 'OR/CR' },
  { type: 'policy', label: 'Policy copy' },
  { type: 'valid_id', label: 'Valid ID' },
]

const PURPOSE_REQUIRED_DOCUMENT_TYPES = Object.freeze({
  renewal: [
    { type: 'or_cr', label: 'OR/CR' },
    { type: 'policy', label: 'Old policy' },
  ],
  new_application: [{ type: 'or_cr', label: 'OR/CR' }],
  claim: [{ type: 'or_cr', label: 'OR/CR' }],
  quotation: [{ type: 'or_cr', label: 'OR/CR' }],
})

const OPTIONAL_DOCUMENT_TYPES = [
  { type: 'photo', label: 'Damage photo' },
  { type: 'estimate', label: 'Repair estimate' },
  { type: 'police_report', label: 'Police report' },
  { type: 'proof_of_payment', label: 'Proof of payment' },
  { type: 'other', label: 'Other document' },
]

const PURPOSE_SUPPORTING_DOCUMENT_TYPES = Object.freeze({
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
    complete: uploadedTypes.includes(documentType.type),
  }))

export const formatMissingDocumentLabels = (missingRequiredDocuments = []) =>
  (Array.isArray(missingRequiredDocuments) ? missingRequiredDocuments : [])
    .map((item) => String(item?.label ?? '').trim())
    .filter(Boolean)
    .join(', ')

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
  webFile: asset?.file ?? null,
})

export const buildRequirementsChecklist = ({
  purpose,
  status = 'submitted',
  uploadedTypes = [],
} = {}) => {
  const normalizedUploadedTypes = Array.isArray(uploadedTypes) ? uploadedTypes : []
  const requiredTypes =
    PURPOSE_REQUIRED_DOCUMENT_TYPES[purpose] ?? REQUIRED_DOCUMENT_TYPES
  const supportingTypes = PURPOSE_SUPPORTING_DOCUMENT_TYPES[purpose] ?? []
  const optionalTypes = purpose
    ? OPTIONAL_DOCUMENT_TYPES.filter(
        (item) => !supportingTypes.some((supportingItem) => supportingItem.type === item.type),
      )
    : OPTIONAL_DOCUMENT_TYPES

  return {
    purpose: purpose ?? null,
    status,
    required: buildChecklistGroup(requiredTypes, normalizedUploadedTypes),
    supporting: buildChecklistGroup(supportingTypes, normalizedUploadedTypes),
    optional: buildChecklistGroup(optionalTypes, normalizedUploadedTypes),
    guidance: [
      'Readable digital copies accepted',
      'Core documents are required before submit',
      'Police report only when requested',
    ],
  }
}
