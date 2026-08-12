import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

import { summarizeInspectionFindings } from '@/lib/api/generated/inspections/staff-web-inspections'
import { restoreIntakeModalFocus } from './digitalIntakeInspectionWorkspaceForm.mjs'

const intakeModalStack = []

const formatLabel = (value) =>
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDateTime = (value) => {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getVerificationTone = (state) => {
  if (state === 'verified') return 'badge-green'
  if (state === 'mixed_verification') return 'badge-orange'
  return 'badge-gray'
}

export function InspectionCard({ inspection, isSelected, onSelect }) {
  const summaries = summarizeInspectionFindings(inspection.findings)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        isSelected
          ? 'border-brand-orange bg-brand-orange/10'
          : 'border-surface-border bg-surface-card hover:border-brand-orange/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            {formatLabel(inspection.inspectionType)}
          </p>
          <p className="mt-2 text-sm font-bold text-ink-primary">
            {inspection.inspectionReference || 'Intake inspection'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{formatDateTime(inspection.createdAt)}</p>
        </div>
        <span className={`badge ${getVerificationTone(inspection.verificationState)}`}>
          {formatLabel(inspection.verificationState)}
        </span>
      </div>
      <p className="mt-3 max-h-16 overflow-hidden text-sm leading-6 text-ink-secondary">
        {inspection.notes || 'No inspection notes were recorded.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge badge-gray">{formatLabel(inspection.status)}</span>
        <span className="badge badge-gray">
          {inspection.findings?.length ?? 0} finding{inspection.findings?.length === 1 ? '' : 's'}
        </span>
        <span className="badge badge-gray">
          {(inspection.evidence?.length || inspection.attachmentRefs?.length) ?? 0} attachment
          {((inspection.evidence?.length || inspection.attachmentRefs?.length) ?? 0) === 1 ? '' : 's'}
        </span>
        <span className="badge badge-gray">Version {inspection.version ?? 'legacy'}</span>
        {inspection.intakeData?.paperChecklistStatus ? (
          <span className="badge badge-gray">
            Paper: {formatLabel(inspection.intakeData.paperChecklistStatus)}
          </span>
        ) : null}
      </div>
      {summaries.length ? (
        <ul className="mt-3 space-y-1 text-xs text-ink-muted">
          {summaries.slice(0, 2).map((summary) => (
            <li key={summary}>{summary}</li>
          ))}
        </ul>
      ) : null}
    </button>
  )
}

export function IntakeSection({ step, title, description, badge, children }) {
  return (
    <section className="rounded-lg border border-surface-border bg-surface-card p-3 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {step ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Step {step}
            </p>
          ) : null}
          <h2 className="text-base font-bold text-ink-primary">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-ink-muted xl:text-sm">{description}</p> : null}
        </div>
        {badge ? <span className="badge badge-gray">{badge}</span> : null}
      </div>
      <div className="mt-3 lg:mt-2">{children}</div>
    </section>
  )
}

export function IntakeFocusedModal({
  open,
  id,
  title,
  description,
  onClose,
  children,
  widthClassName = 'max-w-3xl',
  returnFocusRef,
}) {
  const dialogRef = useRef(null)
  const stackTokenRef = useRef(Symbol('intake-modal'))
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    const stackToken = stackTokenRef.current
    intakeModalStack.push(stackToken)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    const handleKeyDown = (event) => {
      if (intakeModalStack.at(-1) !== stackToken) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      const stackIndex = intakeModalStack.lastIndexOf(stackToken)
      if (stackIndex >= 0) intakeModalStack.splice(stackIndex, 1)
      document.body.style.overflow = previousOverflow
      restoreIntakeModalFocus(returnFocusRef?.current ?? previousFocus)
    }
  }, [open, returnFocusRef])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overscroll-contain bg-black/70 p-0 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overscroll-contain overflow-hidden rounded-t-lg border border-surface-border bg-surface-card shadow-2xl outline-none md:rounded-lg ${widthClassName}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-ink-primary">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-ghost min-h-11 min-w-11 shrink-0 px-0"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      </section>
    </div>
  )
}
