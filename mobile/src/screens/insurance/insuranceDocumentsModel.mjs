const asArray = (value) => (Array.isArray(value) ? value : [])

export const buildInsuranceDocumentsViewModel = ({
  checklist,
  documentTypeOptions,
  latestInquiry,
  pendingUploads,
}) => {
  const normalizedChecklist =
    checklist && typeof checklist === 'object' ? checklist : {}
  const claimedDocumentTypes = new Set()
  const claimChecklistItems = (items) =>
    asArray(items).filter((item) => {
      const key = item?.type ?? item?.label
      if (!key || claimedDocumentTypes.has(key)) {
        return false
      }
      claimedDocumentTypes.add(key)
      return true
    })
  const checklistGroups = {
    required: claimChecklistItems(normalizedChecklist.required),
    supporting: claimChecklistItems(normalizedChecklist.supporting),
    optional: claimChecklistItems(normalizedChecklist.optional),
  }
  const documents = asArray(latestInquiry?.documents)
  const documentTypeLabelLookup = new Map(
    asArray(documentTypeOptions).map((option) => [
      option?.value,
      option?.label,
    ]),
  )
  const pendingUploadRows = asArray(pendingUploads).map((item) => ({
    ...item,
    documentTypeLabel:
      documentTypeLabelLookup.get(item?.documentType) ??
      item?.documentType ??
      'Document',
  }))
  const requiredCompleteCount = checklistGroups.required.filter(
    (item) => item?.complete,
  ).length

  return {
    checklistGroups,
    documents,
    guidance: asArray(normalizedChecklist.guidance),
    onFileCount: documents.length,
    pendingUploadRows,
    requiredCompleteCount,
    requiredTotalCount: checklistGroups.required.length,
  }
}
