'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({ error, reset }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink-primary">Something went wrong</h2>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <button onClick={reset} className="btn-primary">
          <RotateCcw size={14} /> Try Again
        </button>
      </div>
    </div>
  )
}
