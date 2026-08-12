import { ChevronRight, PanelRightOpen, Save, Users } from 'lucide-react'

import { StatusBadge } from './JobOrderWorkbenchSummary'

export default function JobOrderCommandBar({
  jobOrderReference,
  status,
  isTechnician,
  hasMatchingClaim,
  claimOwnerName,
  hasUnsavedProgressWork,
  stageLabel,
  currentStage,
  vehicleLabel,
  primaryLabel,
  onOpenMyWork,
  onOpenOverview,
  onPrimaryAction,
}) {
  const primaryIcon =
    hasUnsavedProgressWork && currentStage === 'progress' ? (
      <Save size={15} />
    ) : (
      <ChevronRight size={15} />
    )

  return (
    <div
      className="border border-surface-border bg-surface-card/95 px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur"
      data-testid="job-order-command-bar"
    >
      <div className="flex min-h-[64px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-ink-primary">{jobOrderReference}</p>
            <StatusBadge status={status} />
            {!isTechnician ? (
              <span
                className={`badge ${
                  hasMatchingClaim ? 'badge-green' : claimOwnerName ? 'badge-blue' : 'badge-gray'
                }`}
              >
                {hasMatchingClaim
                  ? 'Assigned to you'
                  : claimOwnerName
                    ? `Handled by ${claimOwnerName}`
                    : 'Unassigned'}
              </span>
            ) : null}
            {hasUnsavedProgressWork ? <span className="badge badge-orange">Unsaved changes</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-ink-secondary">
            {stageLabel} - {vehicleLabel}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button type="button" onClick={onOpenMyWork} className="ops-action-secondary">
            <Users size={15} />
            My Work
          </button>
          <button type="button" onClick={onOpenOverview} className="ops-action-secondary">
            <PanelRightOpen size={15} />
            Overview
          </button>
          <button
            type="button"
            onClick={onPrimaryAction}
            className="ops-action-primary hidden xl:inline-flex"
          >
            {primaryIcon}
            {primaryLabel}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenMyWork}
            className="ops-action-secondary h-10 w-10 px-0"
            aria-label="Open My Work"
            title="My Work"
          >
            <Users size={16} />
          </button>
          <button
            type="button"
            onClick={onOpenOverview}
            className="ops-action-secondary h-10 w-10 px-0"
            aria-label="Open workflow overview"
            title="Workflow overview"
          >
            <PanelRightOpen size={16} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onPrimaryAction}
        className="ops-action-primary mt-2 w-full md:hidden"
      >
        {primaryIcon}
        {primaryLabel}
      </button>
    </div>
  )
}
