import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Wallet,
} from 'lucide-react'

import { formatStatusLabel } from '../insuranceView.mjs'
import { getCollectionsWorkflowGuidance } from './CollectionsWorkflowView.mjs'

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
  const {
    detail: actionDetail,
    headline: actionHeadline,
    tone: actionTone,
  } = getCollectionsWorkflowGuidance({
    isTerminalInquiry,
    selectedActionState,
    selectedInquiry,
    selectedRow,
  })

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
          tone={actionTone}
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

        <button
          onClick={onFlagOverdue}
          disabled={submitDisabled || !selectedActionState.canSendPaymentReminder}
          className="btn-secondary"
        >
          <AlertTriangle size={14} />
          Flag Overdue
        </button>

        <button
          onClick={onStartVerifying}
          disabled={submitDisabled || !selectedActionState.canReviewProofOfPayment}
          className="btn-secondary"
        >
          <ClipboardCheck size={14} />
          Start Verifying
        </button>

        <button
          onClick={onMarkPaid}
          disabled={submitDisabled || !selectedActionState.canMarkAsPaid}
          className="btn-secondary"
        >
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
