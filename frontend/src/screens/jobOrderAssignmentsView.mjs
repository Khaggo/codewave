export function buildTechnicianAssignmentRows({
  technicianOptions = [],
  selectedTechnicianIds = [],
  selectedSpecialties = {},
} = {}) {
  const selectedIds = new Set(selectedTechnicianIds);

  return technicianOptions.map((account) => ({
    account,
    checked: selectedIds.has(account.id),
    selectedSpecialty: selectedSpecialties[account.id] ?? '',
  }));
}

export function buildHandoffCandidateRows({
  handoffCandidates = [],
  selectedBookingId = '',
} = {}) {
  return handoffCandidates.map((candidate) => ({
    candidate,
    selected: candidate.bookingId === selectedBookingId,
  }));
}
