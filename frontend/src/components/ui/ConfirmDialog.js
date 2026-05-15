import { AlertTriangle, Trash2 } from 'lucide-react'

const TONE_META = {
  warning: {
    icon: AlertTriangle,
    iconClassName: 'bg-amber-500/12 text-amber-300',
    confirmClassName: 'btn-primary',
  },
  danger: {
    icon: Trash2,
    iconClassName: 'bg-red-500/12 text-red-300',
    confirmClassName: 'btn-danger',
  },
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'warning',
  submitting = false,
  onCancel,
  onConfirm,
}) {
  if (!visible) {
    return null
  }

  const meta = TONE_META[tone] ?? TONE_META.warning
  const Icon = meta.icon

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/72 backdrop-blur-sm" onClick={submitting ? undefined : onCancel} />

      <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="w-full max-w-xl overflow-hidden rounded-t-[28px] border border-surface-border bg-surface-card/98 shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[28px]"
        >
          <div className="flex items-start gap-4 border-b border-surface-border px-5 py-5 md:px-6 md:py-6">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconClassName}`}>
              <Icon size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p id="confirm-dialog-title" className="text-base font-semibold tracking-tight text-ink-primary md:text-lg">
                {title}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{message}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 px-5 py-4 md:flex-row md:justify-end md:px-6 md:py-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn-ghost min-w-[132px] justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={`${meta.confirmClassName} min-w-[132px] justify-center disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
