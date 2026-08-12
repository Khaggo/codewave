'use client'

import { useEffect, useRef } from 'react'
import { MoreHorizontal, RefreshCw } from 'lucide-react'

export function MetricCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
    </div>
  )
}

export function RowActionMenu({ customer, isOpen, isUpdating, onOpen, onClose, onToggleStatus }) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen, onClose])

  return (
    <div ref={menuRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => (isOpen ? onClose() : onOpen(customer.id))}
        className="btn-ghost min-h-9 w-9 justify-center px-0"
        aria-label={`Open actions for ${customer.displayName || customer.email || 'customer'}`}
      >
        <MoreHorizontal size={14} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[176px] rounded-2xl border border-surface-border bg-surface-card p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              onToggleStatus(customer)
              onClose()
            }}
            disabled={isUpdating}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-ink-primary hover:bg-surface-raised disabled:opacity-60"
          >
            <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
            {customer.isActive ? 'Deactivate account' : 'Activate account'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
