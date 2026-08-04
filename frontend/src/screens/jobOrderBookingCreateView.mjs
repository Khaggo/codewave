export function getJobOrderBookingCreateActionState({
  selectedCandidate,
  hasMatchingBookingHandoffClaim = false,
  createStatus = '',
} = {}) {
  return {
    canCreate: Boolean(
      selectedCandidate &&
        hasMatchingBookingHandoffClaim &&
        createStatus !== 'create_submitting',
    ),
    isSubmitting: createStatus === 'create_submitting',
  }
}

export function getTechnicianProfileSpecialties(
  technicianOptions = [],
  technicianId = '',
) {
  return (
    technicianOptions.find((technician) => technician.id === technicianId)
      ?.specialties ?? []
  )
}

export function buildCreateAssignmentPatch(
  technicianOptions = [],
  technicianId = '',
) {
  const specialties = getTechnicianProfileSpecialties(
    technicianOptions,
    technicianId,
  )

  return {
    assignedTechnicianId: technicianId,
    assignedSpecialty: specialties[0] ?? '',
  }
}
