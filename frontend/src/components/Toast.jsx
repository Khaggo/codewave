'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
}

const STYLES = {
  success: {
    border: 'rgb(var(--tone-success-border) / 0.28)',
    bg:     'rgb(var(--tone-success-bg) / 0.12)',
    icon:   'rgb(var(--tone-success-border))',
    text:   'rgb(var(--tone-success-ink))',
  },
  error: {
    border: 'rgb(var(--tone-danger-border) / 0.28)',
    bg:     'rgb(var(--tone-danger-bg) / 0.12)',
    icon:   'rgb(var(--tone-danger-border))',
    text:   'rgb(var(--tone-danger-ink))',
  },
  info: {
    border: 'rgb(var(--tone-info-border) / 0.28)',
    bg:     'rgb(var(--tone-info-bg) / 0.12)',
    icon:   'rgb(var(--brand-orange))',
    text:   'rgb(var(--tone-info-ink))',
  },
}

let toastId = 0

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, title, message }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const s = STYLES[t.type] || STYLES.info
            const Icon = ICONS[t.type] || Info
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3.5 shadow-card"
                style={{
                  background: `linear-gradient(180deg, rgb(var(--surface-card) / 0.98), rgb(var(--surface-card) / 0.94))`,
                  border: `1px solid ${s.border}`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 18px 40px rgb(0 0 0 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.02)`,
                }}
              >
                <div
                  className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: s.bg }}
                >
                  <Icon size={18} style={{ color: s.icon }} />
                </div>
                <div className="flex-1 min-w-0">
                  {t.title && (
                    <p className="text-sm font-bold text-ink-primary">{t.title}</p>
                  )}
                  {t.message && (
                    <p className="text-xs mt-0.5" style={{ color: s.text }}>{t.message}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 text-ink-dim hover:text-ink-secondary transition-colors mt-0.5"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
