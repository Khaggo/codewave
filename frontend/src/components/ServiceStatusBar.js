'use client'

import { Check } from 'lucide-react'

const STAGES = [
  { key: 'intake', label: 'Intake' },
  { key: 'in_repair', label: 'In-Repair' },
  { key: 'qc', label: 'Quality Check' },
  { key: 'ready', label: 'Ready for Pickup' },
]

export default function ServiceStatusBar({ stage }) {
  const activeIndex = Math.max(0, STAGES.findIndex((item) => item.key === stage))

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((item, index) => {
          const isDone = index < activeIndex
          const isActive = index === activeIndex

          return (
            <div key={item.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    isDone
                      ? 'border-transparent text-white'
                      : isActive
                        ? 'border-transparent'
                        : 'border-surface-border bg-surface-raised text-ink-dim'
                  }`}
                  style={
                    isDone
                      ? { backgroundColor: '#f07c00', borderColor: '#f07c00' }
                      : isActive
                        ? { backgroundColor: 'rgba(240,124,0,0.1)', borderColor: '#f07c00', color: '#f07c00' }
                        : {}
                  }
                >
                  {isDone ? <Check size={13} /> : index + 1}
                </div>
                <span
                  className={`mt-1 whitespace-nowrap text-[10px] font-semibold ${
                    index <= activeIndex ? 'text-ink-secondary' : 'text-ink-dim'
                  }`}
                  style={isActive ? { color: '#f07c00' } : {}}
                >
                  {item.label}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className="mx-1 mb-5 h-0.5 flex-1 rounded"
                  style={isDone ? { backgroundColor: '#f07c00' } : { backgroundColor: '#27272a' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
