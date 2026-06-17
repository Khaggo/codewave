'use client'

import { AlertTriangle } from 'lucide-react'

export default function BookingActionConfirmModal({
  visible,
  title = 'Confirm booking action',
  message,
  confirmLabel = 'Confirm',
  submitting = false,
  onCancel,
  onConfirm,
}) {
  if (!visible) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/78 backdrop-blur-sm" />

      <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-action-confirm-modal-title"
          className="w-full max-w-xl overflow-hidden rounded-t-2xl border border-surface-border bg-surface-raised shadow-card-md animate-slide-up md:rounded-2xl"
        >
          <div className="flex items-start gap-4 border-b border-surface-border px-5 py-4 md:px-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
              <AlertTriangle size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p
                id="booking-action-confirm-modal-title"
                className="text-base font-semibold text-ink-primary md:text-lg"
              >
                {title}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">{message}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 px-5 py-4 md:flex-row md:justify-end md:px-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn-ghost justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep booking
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="btn-danger justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
