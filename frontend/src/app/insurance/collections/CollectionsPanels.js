import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileBadge2,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { formatStatusLabel } from '../insuranceView.mjs'

const POSITIVE_BADGE_VALUES = new Set(['active', 'paid'])
const WARNING_BADGE_VALUES = new Set([
  'payment_pending',
  'proof_submitted',
  'unpaid',
  'overdue',
  'for_renewal',
])
const INFO_BADGE_VALUES = new Set(['verifying'])

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

function DetailField({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className={`mt-1 text-sm whitespace-pre-wrap ${accent ? 'font-semibold text-[#a65600]' : 'text-ink-primary'}`}>
        {value || 'Not set'}
      </p>
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="label">
      {label}
      <select value={value} onChange={onChange} className="select">
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CollectionsDetailPanel({
  detailMessage,
  detailState,
  onRefreshDetail,
  proofDocuments,
  selectedInquiry,
  selectedRow,
}) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Case Detail</p>
          <p className="mt-1 text-xs text-ink-muted">Payment, proof, and activity in one place.</p>
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
            <WorkflowBadge value={selectedInquiry.paymentStatus} />
            <WorkflowBadge value={selectedInquiry.status} />
            <span className={`badge ${selectedRow.hasProofOfPayment ? 'badge-green' : 'badge-gray'}`}>
              {selectedRow.hasProofOfPayment ? 'Proof on file' : 'No proof yet'}
            </span>
            {selectedRow.daysOverdue > 0 ? (
              <span className="badge badge-orange">{selectedRow.daysOverdue} days overdue</span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DetailField label="Customer" value={selectedInquiry.customerDisplayName} />
            <DetailField label="Vehicle" value={selectedInquiry.vehicleLabel} />
            <DetailField label="Subject" value={selectedInquiry.subject || selectedInquiry.id} />
            <DetailField label="Policy Number" value={selectedInquiry.policyNumber} />
            <DetailField label="Payment Due" value={formatDateOnly(selectedInquiry.paymentDueAt)} />
            <DetailField
              label="Days Overdue"
              value={selectedRow.daysOverdue > 0 ? String(selectedRow.daysOverdue) : '0'}
              accent={selectedRow.daysOverdue > 0}
            />
            <DetailField label="Last Updated" value={formatDateTime(selectedInquiry.updatedAt)} />
            <DetailField label="Created" value={formatDateTime(selectedInquiry.createdAt)} />
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2">
              <FileBadge2 size={16} className="text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">Proof Of Payment</p>
            </div>
            {proofDocuments.length ? (
              <div className="mt-3 space-y-3">
                {proofDocuments.map((document) => (
                  <div key={document.id ?? `${document.fileName}-${document.fileUrl}`} className="rounded-xl border border-surface-border bg-surface-card px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink-primary">{document.fileName}</p>
                        <p className="mt-1 break-all text-xs text-ink-muted">{document.fileUrl}</p>
                      </div>
                      <span className="badge badge-green">{document.documentTypeLabel || 'Proof Of Payment'}</span>
                    </div>
                    {document.notes ? <p className="mt-2 text-xs leading-5 text-ink-secondary">{document.notes}</p> : null}
                    <p className="mt-2 text-[11px] text-ink-muted">Uploaded {formatDateTime(document.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">No proof-of-payment document has been attached to this case yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">Collections Activity</p>
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
              <p className="mt-3 text-xs text-ink-muted">No collections activity has been recorded for this case yet.</p>
            )}
          </div>
        </div>
      ) : (
        <EmptyPanel
          title="No case selected"
          copy="Choose a collections case from the table to inspect its payment detail and workflow history."
        />
      )}
    </div>
  )
}

export function CollectionsWorkflowPanel({
  isTerminalInquiry,
  nextStatuses,
  onDraftChange,
  onMarkPaid,
  onSave,
  onStartVerifying,
  onFlagOverdue,
  selectedActionState,
  selectedInquiry,
  selectedRow,
  submitDisabled,
  updateDraft,
  updateMessage,
  updateState,
}) {
  const actionHeadline = !selectedInquiry
    ? 'Pick a collections case first'
    : isTerminalInquiry
      ? 'This case is read only'
      : selectedActionState.canMarkAsPaid
        ? 'Payment proof is ready for final confirmation'
        : selectedActionState.canReviewProofOfPayment
          ? 'Proof is ready for review'
          : selectedActionState.canSendPaymentReminder
            ? 'This case still needs collections follow-up'
            : 'Use this panel to keep payment metadata up to date'

  const actionDetail = !selectedInquiry
    ? 'The workflow panel unlocks after you choose a live collections case from the queue.'
    : isTerminalInquiry
      ? 'Closed, cancelled, and rejected inquiries stay visible for history but cannot be edited here.'
      : selectedRow?.daysOverdue > 0
        ? `The case is already ${selectedRow.daysOverdue} day${selectedRow.daysOverdue === 1 ? '' : 's'} overdue, so overdue tagging and reminders should be your first check.`
        : selectedActionState.canReviewProofOfPayment
          ? 'Start verification when the uploaded proof looks complete, then mark the case paid only after staff confirmation.'
          : 'Save status, due date, and review notes together so the next collections handoff is easy to understand.'

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="card-title">Workflow Update</p>
          <p className="mt-1 text-xs text-ink-muted">Update payment state and due date here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${isTerminalInquiry ? 'badge-gray' : 'badge-green'}`}>
            {isTerminalInquiry ? 'Read only' : 'Collections editable'}
          </span>
          <span className="badge badge-gray">Workflow route only</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <WorkspaceSignalCard
          eyebrow="Next best step"
          title={actionHeadline}
          detail={actionDetail}
          tone={
            !selectedInquiry || isTerminalInquiry
              ? 'neutral'
              : selectedActionState.canSendPaymentReminder || selectedRow?.daysOverdue > 0
                ? 'warning'
                : selectedActionState.canReviewProofOfPayment || selectedActionState.canMarkAsPaid
                  ? 'positive'
                  : 'neutral'
          }
        />
        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Quick state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${selectedRow?.daysOverdue > 0 ? 'badge-orange' : 'badge-gray'}`}>
              {selectedRow?.daysOverdue > 0 ? `${selectedRow.daysOverdue} overdue` : 'On time'}
            </span>
            <span className={`badge ${selectedActionState.canReviewProofOfPayment ? 'badge-blue' : 'badge-gray'}`}>
              {selectedActionState.canReviewProofOfPayment ? 'Proof ready' : 'No proof review'}
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
          Payment Status
          <select
            value={updateDraft.paymentStatus}
            onChange={(event) => onDraftChange('paymentStatus', event.target.value)}
            className="select"
            disabled={!selectedInquiry || isTerminalInquiry}
          >
            {['unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue'].map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          Payment Due Date
          <input
            type="date"
            value={updateDraft.paymentDueAt}
            onChange={(event) => onDraftChange('paymentDueAt', event.target.value)}
            className="input"
            disabled={!selectedInquiry || isTerminalInquiry}
          />
        </label>

        <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Action State</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`badge ${selectedActionState.canSendPaymentReminder ? 'badge-orange' : 'badge-gray'}`}>
              {selectedActionState.canSendPaymentReminder ? 'Payment follow-up due' : 'No reminder flag'}
            </span>
            <span className={`badge ${selectedActionState.canReviewProofOfPayment ? 'badge-blue' : 'badge-gray'}`}>
              {selectedActionState.canReviewProofOfPayment ? 'Proof ready for review' : 'No proof review'}
            </span>
            <span className={`badge ${selectedActionState.canMarkAsPaid ? 'badge-green' : 'badge-gray'}`}>
              {selectedActionState.canMarkAsPaid ? 'Ready to mark paid' : 'Paid action locked'}
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
            placeholder="Capture collections notes, verification context, or next follow-up steps."
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
            <Wallet size={14} />
          )}
          Save Collections Update
        </button>

        <button onClick={onFlagOverdue} disabled={submitDisabled || !selectedActionState.canSendPaymentReminder} className="btn-secondary">
          <AlertTriangle size={14} />
          Flag Overdue
        </button>

        <button onClick={onStartVerifying} disabled={submitDisabled || !selectedActionState.canReviewProofOfPayment} className="btn-secondary">
          <ClipboardCheck size={14} />
          Start Verifying
        </button>

        <button onClick={onMarkPaid} disabled={submitDisabled || !selectedActionState.canMarkAsPaid} className="btn-secondary">
          <CheckCircle2 size={14} />
          Mark Paid
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
        <span className="badge badge-gray">Collections fields only</span>
      </div>
    </div>
  )
}
