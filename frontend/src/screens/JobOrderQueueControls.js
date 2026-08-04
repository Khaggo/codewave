import {
  formatBookingReference,
  formatDate,
} from './jobOrderWorkbenchViewModel.mjs'
import {
  buildJobOrderQueueDateSummary,
  buildJobOrderQueueEmptyMessage,
  getHandoffCandidateSelectionState,
} from './jobOrderQueueControlsView.mjs'

export function JobOrderHandoffCandidateList({
  candidates,
  selectedBookingId,
  onSelect,
  selectedSurface = 'brand',
}) {
  return (
    <div className="mt-4 space-y-3">
      {candidates.map((candidate) => {
        const { isSelected, badgeLabel } = getHandoffCandidateSelectionState(
          candidate,
          selectedBookingId,
        )
        const selectedClassName = selectedSurface === 'card'
          ? 'border-brand-orange/45 bg-surface-card'
          : 'border-brand-orange/45 bg-brand-orange/10'
        const idleClassName = selectedSurface === 'card'
          ? 'border-brand-orange/20 bg-surface-raised hover:border-brand-orange/45'
          : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'

        return (
          <button
            key={candidate.bookingId}
            type="button"
            onClick={() => onSelect(candidate)}
            aria-pressed={isSelected}
            className={`w-full rounded-xl border px-4 py-4 text-left transition ${
              isSelected ? selectedClassName : idleClassName
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold tracking-wide text-brand-orange">
                  {formatBookingReference(candidate)}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-primary">
                  {candidate.serviceSummary}
                </p>
                <p className="mt-2 text-xs text-ink-muted">{candidate.customerLabel}</p>
                <p className="mt-1 text-xs text-ink-muted">{candidate.vehicleLabel}</p>
              </div>
              <span className={isSelected ? 'badge badge-orange' : 'badge badge-green'}>
                {badgeLabel}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-ink-muted">
              {formatDate(candidate.scheduledDate)} | {candidate.timeSlotLabel}
            </p>
          </button>
        )
      })}
    </div>
  )
}

export function JobOrderQueueDateStrip({
  entries,
  selectedDate,
  selectedMonth,
  workbenchScope,
  onSelectDate,
}) {
  if (!entries.length) {
    return (
      <p className="text-xs text-ink-muted">
        {buildJobOrderQueueEmptyMessage(workbenchScope, selectedMonth)}
      </p>
    )
  }

  return entries.map((entry) => {
    const isSelected = entry.date === selectedDate

    return (
      <button
        key={entry.date}
        type="button"
        onClick={() => onSelectDate(entry.date)}
        aria-pressed={isSelected}
        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
          isSelected
            ? 'border-brand-orange bg-brand-orange/10 text-ink-primary'
            : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary'
        }`}
      >
        <span className="block font-semibold">{formatDate(entry.date)}</span>
        <span className="mt-1 block text-[11px] opacity-80">
          {buildJobOrderQueueDateSummary(entry, workbenchScope)}
        </span>
      </button>
    )
  })
}
