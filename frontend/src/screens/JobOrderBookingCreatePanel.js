'use client'

import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
} from 'lucide-react'

import {
  buildCreateAssignmentPatch,
  getJobOrderBookingCreateActionState,
  getTechnicianProfileSpecialties,
} from './jobOrderBookingCreateView.mjs'
import { formatBookingReference } from './jobOrderWorkbenchViewModel.mjs'

export default function JobOrderBookingCreatePanel({
  mode = 'primary',
  selectedCandidate,
  staffCode,
  createDraft,
  setCreateDraft,
  onCreateItemChange,
  technicianOptions,
  staffDirectoryMessage,
  createState,
  createStateClassName,
  hasMatchingBookingHandoffClaim,
  onCreate,
}) {
  if (!selectedCandidate) {
    return (
      <div className={mode === 'primary' ? 'empty-panel' : 'empty-panel mt-4'}>
        <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
        <p className="text-sm font-semibold text-ink-primary">
          Select a confirmed or workshop-handoff booking first
        </p>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          The workbench creates job orders from confirmed bookings and bookings
          already moved into workshop handoff.
        </p>
      </div>
    )
  }

  const actionState = getJobOrderBookingCreateActionState({
    selectedCandidate,
    hasMatchingBookingHandoffClaim,
    createStatus: createState.status,
  })
  const selectedSpecialties = getTechnicianProfileSpecialties(
    technicianOptions,
    createDraft.assignedTechnicianId,
  )

  return (
    <div
      className={
        mode === 'primary'
          ? 'rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4'
          : 'mt-4 space-y-4'
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink-primary">
            {mode === 'primary'
              ? 'Ready to create first job order from booking handoff'
              : 'Create / Load Job Order'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {mode === 'primary'
              ? 'This date has a handoff-ready booking but no created job order yet. Use this booking as the primary workspace action.'
              : 'Convert the selected confirmed booking into a new job order without leaving the execution workspace.'}
          </p>
        </div>
        <span className="badge badge-orange">Booking handoff active</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryValue
          label="Source booking"
          value={formatBookingReference(selectedCandidate)}
          detail={selectedCandidate.timeSlotLabel}
        />
        <SummaryValue
          label="Customer and vehicle"
          value={selectedCandidate.customerLabel}
          detail={selectedCandidate.vehicleLabel}
        />
        <SummaryValue
          label="Service and adviser"
          value={selectedCandidate.serviceSummary}
          detail={staffCode || 'Missing staff code'}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs text-ink-muted">Services</p>
        <div className="mt-2 space-y-3">
          {createDraft.items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="rounded-xl border border-surface-border bg-surface-raised p-3"
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                <label className="sr-only" htmlFor={`job-order-item-name-${index}`}>
                  Work item name
                </label>
                <input
                  id={`job-order-item-name-${index}`}
                  value={item.name}
                  onChange={(event) =>
                    onCreateItemChange(index, { name: event.target.value })
                  }
                  className="input"
                  placeholder="Work item name"
                />
                <label className="sr-only" htmlFor={`job-order-item-hours-${index}`}>
                  Estimated whole hours
                </label>
                <input
                  id={`job-order-item-hours-${index}`}
                  type="number"
                  min="1"
                  step="1"
                  value={item.estimatedHours ?? ''}
                  onChange={(event) =>
                    onCreateItemChange(index, {
                      estimatedHours:
                        event.target.value === ''
                          ? undefined
                          : Math.max(1, Math.ceil(Number(event.target.value))),
                    })
                  }
                  className="input"
                  placeholder="Whole hours"
                />
              </div>
              <label
                className="sr-only"
                htmlFor={`job-order-item-description-${index}`}
              >
                Optional work-item description
              </label>
              <textarea
                id={`job-order-item-description-${index}`}
                value={item.description ?? ''}
                onChange={(event) =>
                  onCreateItemChange(index, {
                    description: event.target.value,
                  })
                }
                rows={2}
                className="mt-3 textarea"
                placeholder="Optional work-item description"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-ink-muted">
          Assigned technician profile
          <select
            value={createDraft.assignedTechnicianId}
            onChange={(event) =>
              setCreateDraft((current) => ({
                ...current,
                ...buildCreateAssignmentPatch(
                  technicianOptions,
                  event.target.value,
                ),
              }))
            }
            className="mt-1 select"
          >
            <option value="">Create as draft - assign later</option>
            {technicianOptions.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.displayName || technician.email} - Technician Profile
                {technician.staffCode ? ` (${technician.staffCode})` : ''}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-ink-muted">
            Leaving this blank creates a draft job order instead of assigning a
            technician profile immediately.
          </span>
          {staffDirectoryMessage ? (
            <span className="mt-1 block text-[11px] text-ink-muted">
              {staffDirectoryMessage}
            </span>
          ) : null}
        </label>

        <label className="block text-xs text-ink-muted">
          Assignment specialty
          <select
            value={createDraft.assignedSpecialty}
            onChange={(event) =>
              setCreateDraft((current) => ({
                ...current,
                assignedSpecialty: event.target.value,
              }))
            }
            className="mt-1 select"
            disabled={!createDraft.assignedTechnicianId}
          >
            <option value="">Select the checklist specialty</option>
            {selectedSpecialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-ink-muted">
            The selected specialty determines the printable checklist for this
            technician profile.
          </span>
        </label>

        <label className="block text-xs text-ink-muted md:col-span-2">
          Job-order notes
          <textarea
            value={createDraft.notes}
            onChange={(event) =>
              setCreateDraft((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            rows={3}
            className="mt-1 textarea"
            placeholder="Add workshop notes carried into the job order."
          />
        </label>
      </div>

      {createState.message ? (
        <div className={`mt-4 ${createStateClassName}`} role="status">
          {createState.message}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={!actionState.canCreate}
          className="ops-action-primary"
        >
          {actionState.isSubmitting ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <ClipboardList size={14} />
          )}
          Create job order
        </button>
      </div>
    </div>
  )
}

function SummaryValue({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink-primary">{value}</p>
      <p className="mt-2 text-xs text-ink-muted">{detail}</p>
    </div>
  )
}
