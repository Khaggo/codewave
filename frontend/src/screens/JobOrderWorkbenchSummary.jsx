import { useState } from 'react'
import { CheckCircle2, MoreHorizontal, RefreshCw, ShieldAlert } from 'lucide-react'

import {
  formatStatusLabel,
  STATUS_META,
  WORKSHOP_STATUS_ACTION_LABELS,
} from './jobOrderWorkbenchViewModel.mjs'

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: formatStatusLabel(status), cls: 'badge-gray' }
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>
}

export function ExecutionStatusPanel({
  activeJobOrder,
  nextStatuses,
  isReadyForQaChecklistSatisfied,
  statusDraft,
  setStatusDraft,
  handleStatusUpdate,
  statusState,
  statusStateClassName,
  ownerLabel,
  hasActiveClaim,
}) {
  const [showMoreActions, setShowMoreActions] = useState(false)

  if (!activeJobOrder) return null

  const currentStatus = activeJobOrder.status
  const primaryStatus = nextStatuses.find((status) => status === 'ready_for_qa') ?? null
  const secondaryStatuses = nextStatuses.filter(
    (status) => status !== primaryStatus && status === 'cancelled',
  )
  const isPrimaryDisabled =
    !primaryStatus ||
    !hasActiveClaim ||
    statusState.status === 'status_update_submitting' ||
    (primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied)
  const currentStatusLabel =
    currentStatus === 'assigned'
      ? 'Start the first service when workshop work begins.'
      : currentStatus === 'in_progress'
        ? isReadyForQaChecklistSatisfied
          ? 'Every required service is complete. Send this job order to QA.'
          : 'Complete each service and its required evidence before QA handoff.'
        : currentStatus === 'blocked'
          ? 'Open the blocked service and resume it when the issue is cleared.'
          : currentStatus === 'ready_for_qa'
            ? 'This job order is already waiting on QA release.'
            : 'Use the next valid status action below.'

  return (
    <div className="mt-4 border-t border-surface-border pt-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-primary">QA handoff</p>
            <StatusBadge status={currentStatus} />
            <span className="badge badge-green">{ownerLabel}</span>
          </div>
          <p className="mt-2 text-sm text-ink-secondary">{currentStatusLabel}</p>
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          {primaryStatus ? (
            <button
              type="button"
              onClick={() => handleStatusUpdate(primaryStatus)}
              disabled={isPrimaryDisabled}
              className="ops-action-secondary"
              title={
                primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied
                  ? 'Complete every service, assignment, update, and required evidence item first.'
                  : undefined
              }
            >
              {statusState.status === 'status_update_submitting' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {WORKSHOP_STATUS_ACTION_LABELS[primaryStatus] ?? `Mark as ${formatStatusLabel(primaryStatus)}`}
            </button>
          ) : null}
          {secondaryStatuses.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowMoreActions((current) => !current)}
              className="ops-action-secondary h-10 w-10 px-0"
              aria-label="More job order actions"
              title="More job order actions"
              aria-expanded={showMoreActions}
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied ? (
        <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
          Send to QA unlocks after assignments, all services, a saved update, and required service evidence are complete.
        </div>
      ) : null}
      {showMoreActions && secondaryStatuses.length > 0 ? (
        <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Job order actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryStatuses.map((status) => (
              <button
                key={`shared-secondary-status-${status}`}
                type="button"
                onClick={() => setStatusDraft((current) => ({ ...current, status }))}
                className={`ops-action-secondary ${statusDraft.status === status ? 'border-brand-orange text-ink-primary' : ''}`}
              >
                {WORKSHOP_STATUS_ACTION_LABELS[status] ?? `Mark as ${formatStatusLabel(status)}`}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs text-ink-muted">
            Reason
            <textarea
              value={statusDraft.reason}
              onChange={(event) =>
                setStatusDraft((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              rows={2}
              className="mt-1 textarea"
              placeholder="Add context for this status change."
            />
          </label>
          <button
            type="button"
            onClick={() => handleStatusUpdate(statusDraft.status)}
            disabled={
              !hasActiveClaim ||
              !secondaryStatuses.includes(statusDraft.status) ||
              statusState.status === 'status_update_submitting'
            }
            className="ops-action-secondary mt-3"
          >
            Confirm status change
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        {currentStatus === 'in_progress' && isReadyForQaChecklistSatisfied ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-5 text-emerald-100">
            This job order already has the required work completion, progress trail, and evidence. Use{' '}
            <span className="font-semibold">Send to QA</span> now.
          </div>
        ) : null}
      </div>

      {statusState.message ? <div className={`mt-4 ${statusStateClassName}`}>{statusState.message}</div> : null}
    </div>
  )
}

export function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-xs leading-5 text-ink-secondary">{sub}</p> : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel">
      <ShieldAlert size={34} className="mx-auto text-brand-orange" />
      <p className="mt-3 text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-secondary">{copy}</p>
    </div>
  )
}
