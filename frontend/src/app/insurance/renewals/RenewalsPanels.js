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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-black text-ink-primary">{value}</p>
          {sub ? <p className="mt-2 max-w-[22ch] text-[11px] leading-5 text-ink-muted">{sub}</p> : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

const getFocusToneClasses = (tone) => {
  if (tone === 'urgent') {
    return 'border-[#f07c00]/30 bg-[#f07c00]/10 text-[#ffddb8]'
  }

  if (tone === 'empty') {
    return 'border-white/8 bg-white/[0.03] text-ink-muted'
  }

  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
}

export function WorkspaceFocusBanner({ title, detail, tone = 'focused', meta = [] }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${getFocusToneClasses(tone)}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-inherit/80">{detail}</p>
        </div>
        {meta.length ? (
          <div className="flex flex-wrap gap-2">
            {meta.map((item) => (
              <span key={item.label} className="badge badge-gray">
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function WorkspaceSignalCard({ eyebrow, title, detail, tone = 'neutral' }) {
  const toneClasses =
    tone === 'positive'
      ? 'border-emerald-500/15 bg-emerald-500/10'
      : tone === 'warning'
        ? 'border-[#f07c00]/20 bg-[#f07c00]/10'
        : 'border-surface-border bg-surface-raised'

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">{eyebrow}</p>
      <p className="mt-2 text-sm font-semibold text-ink-primary">{title}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-ink-muted">{detail}</p> : null}
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
          <p className="mt-1 text-xs text-ink-muted">Timing, policy data, and activity in one place.</p>
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
  const workflowHeadline = !selectedInquiry
    ? 'Pick a renewal case first'
    : isTerminalInquiry
      ? 'This renewal is read only'
      : selectedRow?.timeWindow === 'Overdue'
        ? 'Recover this overdue renewal quickly'
        : updateDraft.renewalStatus === 'awaiting_customer'
          ? 'Waiting on the customer now'
          : 'Keep the renewal moving forward'

  const workflowDetail = !selectedInquiry
    ? 'Select a live renewal from the queue to unlock timing edits, stage changes, and assignee updates.'
    : isTerminalInquiry
      ? 'Closed, cancelled, and rejected inquiries stay visible here for context but cannot be changed.'
      : selectedRow?.timeWindow === 'Overdue'
        ? 'Overdue renewals should usually get a new due date, clearer notes, or an explicit next stage so the queue tells the truth.'
        : updateDraft.renewalStatus === 'awaiting_customer'
          ? 'Capture the latest outreach note and keep the next date visible so the team knows when to follow up again.'
          : 'Update stage, dates, assignee, and notes together so the queue and detail panel stay aligned.'

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Renewal Workflow Update</p>
          <p className="mt-1 text-xs text-ink-muted">Update stage, timing, and owner here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${isTerminalInquiry ? 'badge-gray' : 'badge-green'}`}>
            {isTerminalInquiry ? 'Read only' : 'Renewals editable'}
          </span>
          <span className="badge badge-gray">Workflow route only</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <WorkspaceSignalCard
          eyebrow="Next best step"
          title={workflowHeadline}
          detail={workflowDetail}
          tone={
            !selectedInquiry || isTerminalInquiry
              ? 'neutral'
              : selectedRow?.timeWindow === 'Overdue' || updateDraft.renewalStatus === 'awaiting_customer'
                ? 'warning'
                : 'positive'
          }
        />
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Quick state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${selectedRow?.timeWindow === 'Overdue' ? 'badge-orange' : 'badge-gray'}`}>
              {selectedRow?.timeWindow ?? 'No target'}
            </span>
            <span className={`badge ${updateDraft.renewalStatus === 'awaiting_customer' ? 'badge-orange' : 'badge-gray'}`}>
              {updateDraft.renewalStatus === 'awaiting_customer' ? 'Waiting on customer' : 'Staff-owned'}
            </span>
          </div>
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
        <span className="badge badge-gray">Renewal fields only</span>
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
  const creationReady =
    String(createDraft.userId ?? '').trim() &&
    String(createDraft.vehicleId ?? '').trim() &&
    String(createDraft.subject ?? '').trim() &&
    String(createDraft.renewalDueAt ?? '').trim()

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Manual Renewal Follow-Up</p>
          <p className="mt-1 text-xs text-ink-muted">Create a staff-owned renewal case.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-green">Manual follow-up route</span>
          <span className="badge badge-gray">Creates purpose `renewal`</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <WorkspaceSignalCard
          eyebrow="Creation readiness"
          title={creationReady ? 'Ready for a staff-owned follow-up' : 'Needs the core renewal identifiers first'}
          detail={
            creationReady
              ? 'This draft has the minimum queue anchors to create a renewal and send it straight into staff follow-up.'
              : 'User, vehicle, subject, and a renewal due date give the queue enough structure to stay useful after creation.'
          }
          tone={creationReady ? 'positive' : 'warning'}
        />
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Quick state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${creationReady ? 'badge-green' : 'badge-gray'}`}>
              {creationReady ? 'Ready' : 'Needs basics'}
            </span>
            <span className="badge badge-gray">Creates renewal purpose</span>
          </div>
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
          Returns to the queue after save.
        </div>
      </div>
    </div>
  )
}
