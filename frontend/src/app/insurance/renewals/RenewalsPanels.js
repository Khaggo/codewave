import {
  Activity,
  AlertTriangle,
  CalendarClock,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { formatStatusLabel } from '../insuranceView.mjs'

const POSITIVE_BADGE_VALUES = new Set(['active', 'renewed'])
const WARNING_BADGE_VALUES = new Set([
  'for_renewal',
  'upcoming',
  'quote_preparing',
  'quoted',
  'awaiting_customer',
  'expired',
])
const INFO_BADGE_VALUES = new Set(['payment_pending'])

const getBadgeClassName = (value) => {
  if (POSITIVE_BADGE_VALUES.has(value)) return 'badge-green'
  if (WARNING_BADGE_VALUES.has(value)) return 'badge-orange'
  if (INFO_BADGE_VALUES.has(value)) return 'badge-blue'
  return 'badge-gray'
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatDateOnly = (value) => {
  if (!value) return 'Not set'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set'
  }

  return parsedDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-black text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-[11px] text-ink-muted">{sub}</p> : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

export function EmptyPanel({ title, copy }) {
  return (
    <div className="empty-panel px-4 py-10 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

export function WorkflowBadge({ value, children }) {
  return <span className={`badge ${getBadgeClassName(value)}`}>{children ?? formatStatusLabel(value)}</span>
}

function DetailField({ label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className={`mt-1 text-sm whitespace-pre-wrap ${accent ? 'font-semibold text-[#a65600]' : 'text-ink-primary'}`}>
        {value || 'Not set'}
      </p>
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="label">
      {label}
      <select value={value} onChange={onChange} className="select" disabled={disabled}>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function RenewalsDetailPanel({
  detailMessage,
  detailState,
  onRefreshDetail,
  selectedInquiry,
  selectedRow,
}) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Renewal Detail</p>
          <p className="mt-1 text-xs text-ink-muted">
            Renewal timing, policy metadata, and recent staff activity stay together here for quick follow-up review.
          </p>
        </div>
        <button
          onClick={onRefreshDetail}
          disabled={!selectedInquiry || detailState === 'loading'}
          className="btn-secondary"
        >
          {detailState === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh Detail
        </button>
      </div>

      {detailMessage ? (
        <div
          className={`mt-4 ${
            detailState === 'detail_loaded'
              ? 'status-message status-message-success'
              : detailState === 'forbidden_role'
                ? 'status-message status-message-warning'
                : 'status-message status-message-danger'
          }`}
        >
          {detailMessage}
        </div>
      ) : null}

      {selectedInquiry && selectedRow ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <WorkflowBadge value={selectedInquiry.status} />
            <WorkflowBadge value={selectedInquiry.renewalStatus} />
            <span className={`badge ${selectedRow.timeWindow === 'Overdue' ? 'badge-orange' : 'badge-gray'}`}>
              {selectedRow.timeWindow ?? 'No target date'}
            </span>
            <span className={`badge ${selectedInquiry.purpose === 'renewal' ? 'badge-green' : 'badge-gray'}`}>
              {selectedInquiry.purpose === 'renewal' ? 'Manual follow-up case' : 'Existing policy case'}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Customer" value={selectedInquiry.customerDisplayName} />
            <DetailField label="Vehicle" value={selectedInquiry.vehicleLabel} />
            <DetailField label="Subject" value={selectedInquiry.subject || selectedInquiry.id} />
            <DetailField label="Inquiry Type" value={formatStatusLabel(selectedInquiry.inquiryType)} />
            <DetailField label="Provider Name" value={selectedInquiry.providerName} />
            <DetailField label="Policy Number" value={selectedInquiry.policyNumber} />
            <DetailField label="Policy Expiry" value={formatDateOnly(selectedInquiry.policyExpiryAt)} />
            <DetailField
              label="Renewal Due"
              value={formatDateOnly(selectedInquiry.renewalDueAt)}
              accent={selectedRow.timeWindow === 'Overdue'}
            />
            <DetailField label="Assigned Staff" value={selectedInquiry.assignedStaffId} />
            <DetailField label="Last Updated" value={formatDateTime(selectedInquiry.updatedAt)} />
            <div className="md:col-span-2">
              <DetailField label="Description" value={selectedInquiry.description} />
            </div>
            <div className="md:col-span-2">
              <DetailField label="Review Notes" value={selectedInquiry.reviewNotes || selectedInquiry.notes} />
            </div>
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">Renewal Activity</p>
            </div>
            {selectedInquiry.activities?.length ? (
              <div className="mt-3 space-y-3">
                {selectedInquiry.activities.map((activityItem) => (
                  <div
                    key={activityItem.id ?? `${activityItem.action}-${activityItem.createdAt}`}
                    className="rounded-xl border border-surface-border bg-surface-card px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-primary">
                        {formatStatusLabel(activityItem.action)}
                      </p>
                      <p className="text-[11px] text-ink-muted">{formatDateTime(activityItem.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      Actor: {activityItem.actorUserId || 'System'}
                    </p>
                    {activityItem.notes ? (
                      <p className="mt-2 text-sm text-ink-secondary">{activityItem.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">No renewal activity has been recorded for this case yet.</p>
            )}
          </div>
        </div>
      ) : (
        <EmptyPanel
          title="No renewal selected"
          copy="Choose a renewal case from the table to inspect timing, policy details, and recent staff updates."
        />
      )}
    </div>
  )
}

export function RenewalsWorkflowPanel({
  isTerminalInquiry,
  nextStatuses,
  onDraftChange,
  onSave,
  renewalStatusOptions,
  selectedInquiry,
  selectedRow,
  submitDisabled,
  updateDraft,
  updateMessage,
  updateState,
}) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Renewal Workflow Update</p>
          <p className="mt-1 text-xs text-ink-muted">
            This panel only edits renewal workflow metadata and saves through the broad workflow route.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${isTerminalInquiry ? 'badge-gray' : 'badge-green'}`}>
            {isTerminalInquiry ? 'Read only' : 'Renewals editable'}
          </span>
          <span className="badge badge-gray">Workflow route only</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="label">
          Inquiry Status
          <select
            value={updateDraft.status}
            onChange={(event) => onDraftChange('status', event.target.value)}
            className="select"
            disabled={!selectedInquiry || isTerminalInquiry}
          >
            {nextStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Renewal Status
          <select
            value={updateDraft.renewalStatus}
            onChange={(event) => onDraftChange('renewalStatus', event.target.value)}
            className="select"
            disabled={!selectedInquiry || isTerminalInquiry}
          >
            {renewalStatusOptions.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Policy Expiry Date
          <input
            type="date"
            value={updateDraft.policyExpiryAt}
            onChange={(event) => onDraftChange('policyExpiryAt', event.target.value)}
            className="input"
            disabled={!selectedInquiry || isTerminalInquiry}
          />
        </label>

        <label className="label">
          Renewal Due Date
          <input
            type="date"
            value={updateDraft.renewalDueAt}
            onChange={(event) => onDraftChange('renewalDueAt', event.target.value)}
            className="input"
            disabled={!selectedInquiry || isTerminalInquiry}
          />
        </label>

        <label className="label">
          Assigned Staff Id
          <input
            value={updateDraft.assignedStaffId}
            onChange={(event) => onDraftChange('assignedStaffId', event.target.value)}
            className="input"
            placeholder="service-adviser-id"
            disabled={!selectedInquiry || isTerminalInquiry}
          />
        </label>

        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Renewal Queue State</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${selectedRow?.timeWindow === 'Overdue' ? 'badge-orange' : 'badge-gray'}`}>
              {selectedRow?.timeWindow ?? 'No target date'}
            </span>
            <span className={`badge ${selectedInquiry?.purpose === 'renewal' ? 'badge-green' : 'badge-gray'}`}>
              {selectedInquiry?.purpose === 'renewal' ? 'Manual follow-up' : 'Existing case'}
            </span>
            <span className={`badge ${updateDraft.renewalStatus === 'awaiting_customer' ? 'badge-orange' : 'badge-gray'}`}>
              {updateDraft.renewalStatus === 'awaiting_customer' ? 'Waiting on customer' : 'Staff-owned next step'}
            </span>
          </div>
        </div>

        <label className="label md:col-span-2">
          Review Notes
          <textarea
            value={updateDraft.reviewNotes}
            onChange={(event) => onDraftChange('reviewNotes', event.target.value)}
            rows={4}
            className="input min-h-[120px] resize-y"
            placeholder="Capture quote status, outreach context, or the next renewal step."
            disabled={!selectedInquiry || isTerminalInquiry}
          />
        </label>
      </div>

      {updateMessage ? (
        <div
          className={`mt-4 ${
            updateState === 'status_update_saved'
              ? 'status-message status-message-success'
              : updateState === 'forbidden_role'
                ? 'status-message status-message-warning'
                : 'status-message status-message-danger'
          }`}
        >
          {updateMessage}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onSave} disabled={submitDisabled} className="btn-primary">
          {updateState === 'status_update_submitting' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <ShieldCheck size={14} />
          )}
          Save Renewal Update
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
        <span className="badge badge-gray">Expiry and due dates stay in `YYYY-MM-DD` form for the workflow route</span>
        <span className="badge badge-gray">Renewal status and assignee remain editable here</span>
      </div>
    </div>
  )
}

export function RenewalCreationPanel({
  createDraft,
  createMessage,
  createState,
  inquiryTypeOptions,
  onCreate,
  onDraftChange,
  submitDisabled,
}) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Manual Renewal Follow-Up</p>
          <p className="mt-1 text-xs text-ink-muted">
            Create a staff-owned renewal case through the dedicated follow-up route when a customer needs proactive outreach.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-green">Manual follow-up route</span>
          <span className="badge badge-gray">Creates purpose `renewal`</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="label">
          Customer User Id
          <input
            value={createDraft.userId}
            onChange={(event) => onDraftChange('userId', event.target.value)}
            className="input"
            placeholder="user-id"
          />
        </label>

        <label className="label">
          Vehicle Id
          <input
            value={createDraft.vehicleId}
            onChange={(event) => onDraftChange('vehicleId', event.target.value)}
            className="input"
            placeholder="vehicle-id"
          />
        </label>

        <FilterSelect
          label="Inquiry Type"
          value={createDraft.inquiryType}
          onChange={(event) => onDraftChange('inquiryType', event.target.value)}
          options={inquiryTypeOptions}
        />

        <label className="label">
          Assigned Staff Id
          <input
            value={createDraft.assignedStaffId}
            onChange={(event) => onDraftChange('assignedStaffId', event.target.value)}
            className="input"
            placeholder="service-adviser-id"
          />
        </label>

        <label className="label md:col-span-2">
          Subject
          <input
            value={createDraft.subject}
            onChange={(event) => onDraftChange('subject', event.target.value)}
            className="input"
            placeholder="Renewal due next month"
          />
        </label>

        <label className="label md:col-span-2">
          Description
          <textarea
            value={createDraft.description}
            onChange={(event) => onDraftChange('description', event.target.value)}
            rows={4}
            className="input min-h-[120px] resize-y"
            placeholder="Capture why staff are creating this renewal follow-up and what the next outreach should cover."
          />
        </label>

        <label className="label">
          Renewal Due Date
          <input
            type="date"
            value={createDraft.renewalDueAt}
            onChange={(event) => onDraftChange('renewalDueAt', event.target.value)}
            className="input"
          />
        </label>

        <label className="label">
          Policy Expiry Date
          <input
            type="date"
            value={createDraft.policyExpiryAt}
            onChange={(event) => onDraftChange('policyExpiryAt', event.target.value)}
            className="input"
          />
        </label>

        <label className="label">
          Provider Name
          <input
            value={createDraft.providerName}
            onChange={(event) => onDraftChange('providerName', event.target.value)}
            className="input"
            placeholder="Insurer name"
          />
        </label>

        <label className="label">
          Policy Number
          <input
            value={createDraft.policyNumber}
            onChange={(event) => onDraftChange('policyNumber', event.target.value)}
            className="input"
            placeholder="Policy number"
          />
        </label>

        <label className="label md:col-span-2">
          Internal Notes
          <textarea
            value={createDraft.notes}
            onChange={(event) => onDraftChange('notes', event.target.value)}
            rows={3}
            className="input min-h-[100px] resize-y"
            placeholder="Optional context for the staff-created follow-up."
          />
        </label>
      </div>

      {createMessage ? (
        <div
          className={`mt-4 ${
            createState === 'created'
              ? 'status-message status-message-success'
              : createState === 'forbidden_role'
                ? 'status-message status-message-warning'
                : 'status-message status-message-danger'
          }`}
        >
          {createMessage}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onCreate} disabled={submitDisabled} className="btn-primary">
          {createState === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <PlusCircle size={14} />}
          Create Renewal Follow-Up
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-[11px] text-ink-muted">
          <CalendarClock size={14} />
          New cases return to the renewal queue immediately after creation.
        </div>
      </div>
    </div>
  )
}
