'use client'

import { Cog } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-spin"
             style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
          <Cog size={22} className="text-white" />
        </div>
        <p className="text-sm font-medium text-ink-muted">Loading...</p>
      </div>
    </div>
  )
}
