'use client'

import { useState } from 'react'
import { Plus, List, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import BackJobForm from '@/screens/BackJobForm'

const STATUS_META = {
  open:        { label: 'Open',        cls: 'badge-red'    },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  resolved:    { label: 'Resolved',    cls: 'badge-green'  },
}

const PRIORITY_META = {
  critical: { label: 'Critical', cls: 'badge-red'    },
  high:     { label: 'High',     cls: 'badge-orange' },
  normal:   { label: 'Normal',   cls: 'badge-gray'   },
}

const MOCK_BACKJOBS = [
  {
    id: 'BJ-001', parentJO: 'JO-2026-001', plate: 'ABC-1234', owner: 'Juan dela Cruz',
    defectType: 'Fluid Leak Post-Service', priority: 'high', status: 'open',
    issue: 'Oil leak detected 3 days after oil change service.',
    technician: 'Engr. Renan Castro', createdDate: '2026-04-08',
  },
  {
    id: 'BJ-002', parentJO: 'JO-2026-002', plate: 'XYZ-5678', owner: 'Maria Santos',
    defectType: 'Recurring Issue', priority: 'normal', status: 'in_progress',
    issue: 'Brake squeal returned after pad replacement.',
    technician: 'Engr. Dennis Ocampo', createdDate: '2026-04-06',
  },
  {
    id: 'BJ-003', parentJO: 'JO-2026-004', plate: 'LMN-3456', owner: 'Ana Lim',
    defectType: 'Incomplete Work', priority: 'normal', status: 'resolved',
    issue: 'Air filter housing clip was left unlatched after PMS.',
    technician: 'Engr. Dennis Ocampo', createdDate: '2026-03-15',
  },
]

export default function BackJobsContent() {
  const [tab, setTab] = useState('list')
  const [backjobs, setBackjobs] = useState(MOCK_BACKJOBS)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = backjobs.filter(b => statusFilter === 'all' || b.status === statusFilter)

  const openCount       = backjobs.filter(b => b.status === 'open').length
  const inProgressCount = backjobs.filter(b => b.status === 'in_progress').length

  function cycleStatus(id) {
    const order = ['open', 'in_progress', 'resolved']
    setBackjobs(bjs => bjs.map(b => {
      if (b.id !== id) return b
      const next = order[(order.indexOf(b.status) + 1) % order.length]
      return { ...b, status: next }
    }))
  }

  return (
    <div className="space-y-5">

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle size={17} className="text-red-400" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-ink-primary">{openCount}</p>
            <p className="text-xs text-ink-muted">Open</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(240,124,0,0.1)' }}>
            <Clock size={17} style={{ color: '#f07c00' }} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-ink-primary">{inProgressCount}</p>
            <p className="text-xs text-ink-muted">In Progress</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
            <CheckCircle2 size={17} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-ink-primary">
              {backjobs.filter(b => b.status === 'resolved').length}
            </p>
            <p className="text-xs text-ink-muted">Resolved</p>
          </div>
        </div>
      </div>

      {/* Tab header */}
      <div className="flex gap-1 p-1 bg-surface-card border border-surface-border rounded-xl w-fit">
        {[
          { key: 'list', icon: List,  label: 'All Back-Jobs' },
          { key: 'new',  icon: Plus,  label: 'New Back-Job'  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover'
            }`}
            style={tab === t.key ? { background: '#f07c00' } : {}}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* List tab */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'open', 'in_progress', 'resolved'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  statusFilter === s
                    ? 'text-white border-transparent'
                    : 'border-surface-border text-ink-muted hover:bg-surface-hover'
                }`}
                style={statusFilter === s ? { backgroundColor: '#f07c00', borderColor: '#f07c00' } : {}}>
                {s === 'all' ? `All (${backjobs.length})` : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead>
                  <tr className="text-left text-xs text-ink-muted border-b border-surface-border bg-surface-raised">
                    <th className="px-5 py-3.5 font-semibold">Back-Job ID</th>
                    <th className="px-5 py-3.5 font-semibold">Parent JO</th>
                    <th className="px-5 py-3.5 font-semibold">Vehicle / Owner</th>
                    <th className="px-5 py-3.5 font-semibold">Defect</th>
                    <th className="px-5 py-3.5 font-semibold">Priority</th>
                    <th className="px-5 py-3.5 font-semibold">Technician</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-muted text-sm">
                        No back-jobs match your filter.
                      </td>
                    </tr>
                  ) : filtered.map(b => {
                    const pMeta = PRIORITY_META[b.priority]
                    const sMeta = STATUS_META[b.status]
                    return (
                      <tr key={b.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                                style={{ backgroundColor: 'rgba(240,124,0,0.1)', color: '#f07c00' }}>
                            {b.id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-ink-secondary">{b.parentJO}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-ink-primary">{b.owner}</p>
                          <p className="text-xs text-ink-muted">{b.plate}</p>
                        </td>
                        <td className="px-5 py-3.5 text-ink-secondary text-xs max-w-[180px]">
                          <p className="font-medium text-ink-primary text-sm">{b.defectType}</p>
                          <p className="truncate mt-0.5">{b.issue}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${pMeta.cls}`}>{pMeta.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-ink-secondary text-xs">{b.technician}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => cycleStatus(b.id)}
                            className={`badge ${sMeta.cls} cursor-pointer hover:opacity-80 transition-opacity`}
                            title="Click to cycle status">
                            {sMeta.label}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-surface-border text-xs text-ink-muted">
              Showing {filtered.length} of {backjobs.length} back-jobs · Click status badge to update
            </div>
          </div>
        </div>
      )}

      {/* New Back-Job tab */}
      {tab === 'new' && (
        <div className="card p-5 md:p-6">
          <BackJobForm onClose={() => setTab('list')} />
        </div>
      )}
    </div>
  )
}
