'use client'

import { AlertTriangle, ArrowRight, Check, Circle } from 'lucide-react'

import PortalLink from '@/components/PortalLink'

const SERVICE_STEPS = [
  { key: 'booking', label: 'Booking' },
  { key: 'intake', label: 'Intake' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'qa', label: 'QA' },
  { key: 'payment', label: 'Payment' },
  { key: 'complete', label: 'Complete' },
]

export default function ServiceLifecycleHeader({
  currentStep,
  reference,
  customer,
  vehicle,
  status,
  owner,
  blocker,
  nextAction,
  actionLabel,
  actionHref,
  onAction,
}) {
  const currentStepIndex = Math.max(
    0,
    SERVICE_STEPS.findIndex((step) => step.key === currentStep),
  )

  const actionClassName =
    'btn-primary min-h-10 shrink-0 justify-center px-4 text-sm'

  return (
    <section
      aria-label="Service lifecycle"
      className="rounded-lg border border-surface-border bg-surface-card px-4 py-3"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold text-brand-orange">
              {reference || 'No service record selected'}
            </p>
            {status ? <span className="badge badge-gray">{status}</span> : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-primary">
            {[customer, vehicle].filter(Boolean).join(' / ') || 'Select a record to begin'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {owner ? <span className="badge badge-blue">Owner: {owner}</span> : null}
          {actionHref && actionLabel ? (
            <PortalLink href={actionHref} className={actionClassName}>
              {actionLabel}
              <ArrowRight size={14} />
            </PortalLink>
          ) : onAction && actionLabel ? (
            <button type="button" onClick={onAction} className={actionClassName}>
              {actionLabel}
              <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
      <ol className="grid min-w-[560px] grid-cols-6 gap-1.5" aria-label="Service stages">
        {SERVICE_STEPS.map((step, index) => {
          const isDone = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex min-h-9 items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                isDone
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                  : isCurrent
                    ? 'border-brand-orange/35 bg-brand-orange/10 text-ink-primary'
                    : 'border-surface-border bg-surface-raised text-ink-muted'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/30">
                {isDone ? <Check size={12} /> : isCurrent ? <Circle size={9} fill="currentColor" /> : index + 1}
              </span>
              {step.label}
            </li>
          )
        })}
      </ol>
      </div>

      {blocker || nextAction ? (
        <div className={`mt-3 grid gap-2 ${blocker && nextAction ? 'lg:grid-cols-2' : ''}`}>
          {blocker ? (
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <span className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              Blocked
            </span>
            <span className="ml-2">{blocker}</span>
          </div>
          ) : null}
          {nextAction ? (
          <div className="rounded-md border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-sm text-ink-primary">
            <span className="font-semibold">Next action:</span>{' '}
            {nextAction}
          </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
