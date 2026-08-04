'use client'

import {
  AlertTriangle,
  FileStack,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import {
  buildHandoffCandidateRows,
  buildTechnicianAssignmentRows,
} from './jobOrderAssignmentsView.mjs'

export default function JobOrderAssignmentsPanel({
  activeJobOrder,
  assignmentDraftIds,
  assignmentDraftSpecialties,
  assignmentState,
  assignmentStateClassName,
  canManageAssignments,
  formatBookingReference,
  formatDate,
  handleAssignmentToggle,
  handleExportTechnicianChecklist,
  handleSaveAssignments,
  handleSelectHandoffCandidate,
  handoffCandidates,
  handoffState,
  handoffStateClassName,
  hasMatchingJobOrderClaim,
  queueMode,
  renderBookingCreateWorkspace,
  selectedBookingId,
  selectedCandidate,
  selectedDate,
  setAssignmentDraftSpecialties,
  staffDirectoryState,
  technicianOptions,
}) {
  const technicianRows = buildTechnicianAssignmentRows({
    technicianOptions,
    selectedTechnicianIds: assignmentDraftIds,
    selectedSpecialties: assignmentDraftSpecialties,
  })
  const handoffRows = buildHandoffCandidateRows({
    handoffCandidates,
    selectedBookingId,
  })

  return (
    <div id="job-order-stage-assignments" className="ops-panel scroll-mt-48">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="card-title">Assignments</p>
            <span className="badge badge-blue">Service adviser / admin</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Assign the selected job order or create one from the handoff queue.
          </p>
        </div>
        <span
          className={`badge ${
            staffDirectoryState.status === 'error' ? 'badge-red' : 'badge-green'
          }`}
        >
          {staffDirectoryState.status === 'loading'
            ? 'Loading technicians'
            : `${technicianRows.length} technician option${
                technicianRows.length === 1 ? '' : 's'
              }`}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Selected Job Order Team</p>
          <p className="mt-1 text-xs text-ink-muted">
            Save technician profile coverage for the selected job order before pushing the work
            forward.
          </p>
          {activeJobOrder ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Current assignment
                </p>
                <p className="mt-1 text-sm text-ink-primary">
                  {activeJobOrder.assignedTechnicianIds.length > 0
                    ? `${activeJobOrder.assignedTechnicianIds.length} technician profile${
                        activeJobOrder.assignedTechnicianIds.length === 1 ? '' : 's'
                      } assigned`
                    : 'No technician profile assigned'}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Draft job orders may stay unassigned. Assigned and operational job orders require
                  at least one saved technician profile.
                </p>
              </div>
              {Array.isArray(activeJobOrder.assignments) &&
              activeJobOrder.assignments.length > 0 ? (
                <div className="space-y-2">
                  {activeJobOrder.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {assignment.technicianName ||
                              assignment.technicianCode ||
                              'Assigned technician profile'}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {assignment.selectedSpecialty || 'general repair'}
                            {assignment.technicianCode ? ` - ${assignment.technicianCode}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExportTechnicianChecklist(assignment)}
                          className="ops-action-secondary"
                        >
                          <FileStack size={14} />
                          Checklist PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {canManageAssignments ? (
                <>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {technicianRows.length > 0 ? (
                      technicianRows.map(({ account, checked, selectedSpecialty }) => (
                        <div
                          key={account.id}
                          className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary"
                        >
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                handleAssignmentToggle(account.id, event.target.checked)
                              }
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block font-semibold">
                                {account.displayName || account.email}
                              </span>
                              <span className="mt-1 block text-xs text-ink-muted">
                                Technician profile
                                {account.staffCode ? ` - ${account.staffCode}` : ''}
                              </span>
                            </span>
                          </label>
                          {checked ? (
                            <label className="mt-3 block text-xs text-ink-muted">
                              Specialty for this job order
                              <select
                                value={selectedSpecialty}
                                onChange={(event) =>
                                  setAssignmentDraftSpecialties((current) => ({
                                    ...current,
                                    [account.id]: event.target.value,
                                  }))
                                }
                                className="select mt-1"
                              >
                                {(account.specialties ?? []).map((specialty) => (
                                  <option key={`${account.id}-${specialty}`} value={specialty}>
                                    {specialty}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3 text-xs text-ink-muted">
                        No active technician profiles are available in the directory yet.
                      </div>
                    )}
                  </div>
                  {assignmentState.message ? (
                    <div className={assignmentStateClassName}>{assignmentState.message}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSaveAssignments}
                    disabled={
                      !activeJobOrder ||
                      !hasMatchingJobOrderClaim ||
                      assignmentState.status === 'assignment_submitting'
                    }
                    className="ops-action-primary"
                  >
                    {assignmentState.status === 'assignment_submitting' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    Save Assignments - adviser/admin
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="empty-panel mt-3">
              <p className="text-sm font-semibold text-ink-primary">Load a job order first</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Choose an existing job order from the queue before editing assignments.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink-primary">Booking Handoff Sources</p>
              <p className="mt-1 text-xs text-ink-muted">
                {queueMode === 'handoff_create'
                  ? 'Use this list as the source picker for the promoted create workspace above.'
                  : 'Select a confirmed booking when you need to create another job order in the live queue.'}
              </p>
            </div>
            <span className="badge badge-gray">{formatDate(selectedDate)}</span>
          </div>

          {handoffState.message ? (
            <div className={`mt-4 ${handoffStateClassName}`}>{handoffState.message}</div>
          ) : null}

          <div className="mt-4 space-y-3">
            {handoffRows.length === 0 ? (
              <div className="empty-panel">
                <p className="text-sm font-semibold text-ink-primary">
                  No confirmed handoffs for this date
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Booking handoff remains schedule-derived. Only confirmed bookings can move into
                  job-order creation.
                </p>
              </div>
            ) : (
              handoffRows.map(({ candidate, selected }) => (
                <button
                  key={candidate.bookingId}
                  onClick={() => handleSelectHandoffCandidate(candidate)}
                  className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                    selected
                      ? 'border-brand-orange/45 bg-brand-orange/10'
                      : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
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
                    <span className="badge badge-green">Confirmed source</span>
                  </div>
                  <p className="mt-3 text-[11px] text-ink-muted">
                    {formatDate(candidate.scheduledDate)} | {candidate.timeSlotLabel}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="ops-panel-muted mt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Workflow rule
            </p>
            <p className="mt-1 text-sm text-ink-primary">
              Pending, cancelled, and completed bookings are hidden from handoff creation.
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Confirm the booking on the schedule page first, then refresh this workbench.
            </p>
          </div>

          {!selectedCandidate ? (
            <div className="empty-panel mt-4">
              <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">
                Select a confirmed or workshop-handoff booking first
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                The workbench creates job orders from confirmed bookings and bookings already moved
                into workshop handoff.
              </p>
            </div>
          ) : queueMode === 'handoff_create' ? (
            <div className="ops-panel-muted mt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Promoted action
              </p>
              <p className="mt-1 text-sm text-ink-primary">
                The selected booking is now driving the top create-first workspace. Change the
                source here if you want to create the job order from a different handoff.
              </p>
            </div>
          ) : (
            renderBookingCreateWorkspace({ mode: 'secondary' })
          )}
        </div>
      </div>
    </div>
  )
}
