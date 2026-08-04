'use client'

import {
  CheckCircle2,
  FileStack,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

import {
  formatDateTime,
  formatPesoAmount,
  formatStatusLabel,
  paymentMethodOptions,
} from './jobOrderWorkbenchViewModel.mjs'
import {
  getJobOrderFinalizationActionState,
  getPaymentSettlementChannelLabel,
} from './jobOrderFinalizationView.mjs'

export default function JobOrderFinalizationPanel({
  activeJobOrder,
  canFinalizeClaimedWork,
  finalizationBlockers,
  finalizationSuggestedSummary,
  finalizeDraft,
  setFinalizeDraft,
  finalizeState,
  finalizeStateClassName,
  paymentDraft,
  setPaymentDraft,
  paymentState,
  paymentStateClassName,
  onFinalize,
  onRecordManualPayment,
  onStartOnlineCheckout,
  onRefreshOnlineCheckout,
  onExportInvoice,
}) {
  const actionState = getJobOrderFinalizationActionState({
    jobOrder: activeJobOrder,
    canFinalizeClaimedWork,
    finalizeStatus: finalizeState.status,
    paymentStatus: paymentState.status,
  })
  const invoiceRecord = activeJobOrder?.invoiceRecord

  return (
    <div id="job-order-stage-finalize" className="ops-panel scroll-mt-48">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="card-title">Finalize</p>
            <span className="badge badge-blue">Service adviser / admin</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Finalization, payment capture, and invoice export stay on one screen so
            advisers can see readiness blockers before they commit the release record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-gray">Head-technician pass required</span>
          <span className="badge badge-gray">Adviser/admin only</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">
            Finalize Invoice-Ready Work
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            The backend will reject this action unless pre-check review, work
            completion, and payment prerequisites are all satisfied.
          </p>
          <label className="mt-3 block text-xs text-ink-muted">
            Finalization summary
            <textarea
              value={finalizeDraft.summary}
              onChange={(event) =>
                setFinalizeDraft((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              rows={4}
              className="mt-1 textarea"
              placeholder="Describe completed work for the invoice-ready record."
            />
          </label>
          {!finalizationSuggestedSummary ? (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              No work notes found - please describe completed work before finalizing.
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs text-ink-muted">
              Amount received (PHP)
              <input
                type="number"
                min="1"
                step="1"
                value={paymentDraft.amountPaid}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    amountPaid: event.target.value,
                  }))
                }
                className="mt-1 input"
                placeholder="2500"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Payment method
              <select
                value={paymentDraft.paymentMethod}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))
                }
                className="mt-1 select"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Payment reference
              <input
                value={paymentDraft.reference}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                className="mt-1 input"
                placeholder="GCASH-TEST-1234"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Received at
              <input
                type="datetime-local"
                value={paymentDraft.receivedAt}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    receivedAt: event.target.value,
                  }))
                }
                className="mt-1 input"
              />
            </label>
          </div>
          {finalizationBlockers.length > 0 ? (
            <div className="status-message status-message-danger mt-3">
              <p className="font-semibold text-red-100">Finalization blockers</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {finalizationBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {finalizeState.message ? (
            <div className={`mt-3 ${finalizeStateClassName}`} role="status">
              {finalizeState.message}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onFinalize}
              disabled={!actionState.canFinalize}
              className="ops-action-primary"
            >
              {finalizeState.status === 'finalize_submitting' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {invoiceRecord
                ? 'Invoice Already Generated'
                : 'Finalize Invoice-Ready Work - adviser/admin'}
            </button>
            <button
              type="button"
              onClick={onRecordManualPayment}
              disabled={!actionState.canRecordManualPayment}
              className="ops-action-secondary"
            >
              {paymentState.status === 'payment_submitting' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Record Manual Payment - adviser/admin
            </button>
            <button
              type="button"
              onClick={onStartOnlineCheckout}
              disabled={!actionState.canStartOnlineCheckout}
              className="ops-action-secondary"
            >
              <FileStack size={14} />
              Start PayMongo Checkout - adviser/admin
            </button>
            <button
              type="button"
              onClick={onRefreshOnlineCheckout}
              disabled={!actionState.canRefreshOnlineCheckout}
              className="ops-action-secondary"
            >
              <RefreshCw size={14} />
              Refresh PayMongo Status - adviser/admin
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">
            Invoice Record & Export
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Once finalization succeeds, this panel becomes the source of truth for
            OR/reference, totals, payment state, and printable invoice output.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <InvoiceValue
              label="Invoice reference"
              value={invoiceRecord?.invoiceReference ?? 'Generated after finalization'}
            />
            <InvoiceValue
              label="Official receipt"
              value={
                invoiceRecord?.officialReceiptReference ??
                'Generated automatically'
              }
            />
            <InvoiceValue
              label="Reservation fee deduction"
              value={formatPesoAmount(
                invoiceRecord?.reservationFeeDeductionCents ?? 0,
              )}
            />
            <InvoiceValue
              label="Total amount"
              value={formatPesoAmount(invoiceRecord?.totalAmountCents ?? 0)}
            />
            <InvoiceValue
              label="Payment status"
              value={
                invoiceRecord
                  ? formatStatusLabel(invoiceRecord.paymentStatus)
                  : 'Awaiting finalization'
              }
            />
            <InvoiceValue
              label="Settlement channel"
              value={getPaymentSettlementChannelLabel(invoiceRecord)}
            />
            <InvoiceValue
              label="Online payment state"
              value={
                invoiceRecord?.onlinePaymentStatus
                  ? formatStatusLabel(invoiceRecord.onlinePaymentStatus)
                  : 'No online checkout yet'
              }
            />
            <InvoiceValue
              label="Email delivery"
              value={
                invoiceRecord?.pdfEmailSentAt
                  ? `Sent ${formatDateTime(invoiceRecord.pdfEmailSentAt)}`
                  : invoiceRecord?.pdfEmailError
                    ? 'Delivery retry needed'
                    : 'Will send after PDF generation'
              }
            />
          </div>
          {paymentState.message ? (
            <div className={`mt-3 ${paymentStateClassName}`} role="status">
              {paymentState.message}
            </div>
          ) : null}
          {invoiceRecord?.onlinePaymentFailureReason ? (
            <div className="status-message status-message-danger mt-3">
              {invoiceRecord.onlinePaymentFailureReason}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onExportInvoice}
              disabled={!actionState.canExportInvoice}
              className="ops-action-primary"
            >
              <FileStack size={14} />
              Export Invoice PDF - adviser/admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InvoiceValue({ label, value }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-sm text-ink-primary">{value}</p>
    </div>
  )
}
