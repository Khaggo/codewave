'use client'

import { AlertCircle, LoaderCircle, PackageSearch, RefreshCw } from 'lucide-react'

export function AccessoriesHeader({ title, description, actions }) {
  return (
    <header className="flex flex-col gap-3 border-b border-surface-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink-primary">{title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function AccessoriesState({ status, title, message, onRetry }) {
  const loading = status === 'loading'
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 border-y border-surface-border px-6 py-10 text-center" role={status === 'error' ? 'alert' : 'status'}>
      {loading ? <LoaderCircle className="animate-spin text-brand-orange" size={26} /> : status === 'error' ? <AlertCircle className="text-status-danger" size={28} /> : <PackageSearch className="text-ink-muted" size={28} />}
      <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
      <p className="max-w-xl text-sm leading-6 text-ink-secondary">{message}</p>
      {onRetry ? <button type="button" className="btn-ghost min-h-11" onClick={onRetry}><RefreshCw size={15} /> Retry</button> : null}
    </div>
  )
}

export function AccessoriesNotice({ tone = 'info', children }) {
  const toneClass = tone === 'error' ? 'border-status-danger/40 bg-status-danger/10 text-status-danger' : tone === 'success' ? 'border-status-success/40 bg-status-success/10 text-status-success' : 'border-surface-border bg-surface-raised text-ink-secondary'
  return <div className={`border px-4 py-3 text-sm ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function StatusBadge({ value }) {
  return <span className="inline-flex min-h-6 items-center rounded-full border border-surface-border bg-surface-raised px-2 text-[11px] font-semibold capitalize text-ink-secondary">{String(value || 'unknown').replaceAll('_', ' ')}</span>
}
