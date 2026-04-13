'use client'

import { useState } from 'react'
import { Search, Wrench, CheckCircle2, AlertTriangle, Link2 } from 'lucide-react'
import { jobOrders, vehicles, TECHNICIANS } from '@/lib/mockData'

const DEFECT_TYPES = [
  'Incomplete Work',
  'Recurring Issue',
  'Wrong Part Installed',
  'Fluid Leak Post-Service',
  'New Issue After Service',
  'Customer Dissatisfaction',
]

const PRIORITIES = [
  { value: 'normal',   label: 'Normal',   color: '#71717a' },
  { value: 'high',     label: 'High',     color: '#f07c00' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
]

export default function BackJobForm({ onClose }) {
  const [joSearch,   setJoSearch]   = useState('')
  const [selectedJO, setSelectedJO] = useState(null)
  const [form,       setForm]       = useState({
    defectType:  '',
    issue:       '',
    rootCause:   '',
    priority:    'normal',
    technician:  TECHNICIANS[0],
    targetDate:  '',
    notes:       '',
  })
  const [submitted, setSubmitted] = useState(false)

  const filteredJOs = jobOrders
    .filter(jo => jo.status === 'completed')
    .filter(jo => joSearch === '' ||
      jo.id.toLowerCase().includes(joSearch.toLowerCase()) ||
      vehicles.find(v => v.id === jo.vehicleId)?.plate.toLowerCase().includes(joSearch.toLowerCase()) ||
      vehicles.find(v => v.id === jo.vehicleId)?.owner.toLowerCase().includes(joSearch.toLowerCase())
    )

  const linkedVehicle = selectedJO ? vehicles.find(v => v.id === selectedJO.vehicleId) : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedJO) return
    setSubmitted(true)
  }

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
           style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
        <CheckCircle2 size={28} className="text-emerald-400" />
      </div>
      <p className="text-lg font-bold text-ink-primary">Back-Job Recorded</p>
      <p className="text-sm text-ink-secondary max-w-sm">
        Linked to <span className="font-mono font-bold" style={{ color: '#f07c00' }}>{selectedJO?.id}</span>.
        The assigned technician has been notified.
      </p>
      <button onClick={() => { setSubmitted(false); setSelectedJO(null); setJoSearch(''); onClose?.() }}
        className="btn-ghost mt-2">Close</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* ── Section 1: Parent Job Reference ─────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={15} style={{ color: '#f07c00' }} />
          <p className="font-bold text-ink-primary text-sm">Parent Job Order Reference</p>
          <span className="badge badge-red text-[10px]">Required</span>
        </div>

        <div>
          <label className="label">Search by JO ID, Plate, or Owner Name</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input value={joSearch} onChange={e => { setJoSearch(e.target.value); setSelectedJO(null) }}
              placeholder="e.g. JO-2026-001 or ABC-1234…"
              className="input pl-9" />
          </div>
        </div>

        {/* JO search results */}
        {joSearch && !selectedJO && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            {filteredJOs.length === 0
              ? <p className="px-4 py-3 text-sm text-ink-muted">No completed job orders found.</p>
              : filteredJOs.map(jo => {
                  const v = vehicles.find(veh => veh.id === jo.vehicleId)
                  return (
                    <button key={jo.id} type="button" onClick={() => setSelectedJO(jo)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-hover transition-colors border-b border-surface-border last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold font-mono" style={{ color: '#f07c00' }}>{jo.id}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">
                            {v?.plate} — {v?.owner} · {v?.model}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5">{jo.services.join(', ')}</p>
                        </div>
                        <p className="text-xs text-ink-muted flex-shrink-0">
                          {new Date(jo.date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                        </p>
                      </div>
                    </button>
                  )
                })
            }
          </div>
        )}

        {/* Selected JO card */}
        {selectedJO && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(240,124,0,0.06)', borderColor: 'rgba(240,124,0,0.25)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-ink-muted mb-1">Linked Job Order</p>
                <p className="font-extrabold font-mono" style={{ color: '#f07c00' }}>{selectedJO.id}</p>
                <p className="text-sm text-ink-secondary mt-1">
                  {linkedVehicle?.plate} — {linkedVehicle?.owner}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {linkedVehicle?.year} {linkedVehicle?.model} · {selectedJO.services.join(', ')}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Completed: {new Date(selectedJO.date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                  {' '}· {selectedJO.technician}
                </p>
              </div>
              <button type="button" onClick={() => { setSelectedJO(null); setJoSearch('') }}
                className="text-xs text-red-400 hover:text-red-300 flex-shrink-0">Change</button>
            </div>
          </div>
        )}

        {!selectedJO && !joSearch && (
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            A parent job order must be linked before submitting a back-job.
          </p>
        )}
      </div>

      {/* ── Section 2: Issue Details ──────────────── */}
      <div className="card p-5 space-y-4">
        <p className="font-bold text-ink-primary text-sm flex items-center gap-2">
          <Wrench size={15} style={{ color: '#f07c00' }} /> Issue Details
        </p>

        <div>
          <label className="label">Defect Type</label>
          <select value={form.defectType} onChange={e => setForm(f=>({...f,defectType:e.target.value}))}
            className="select" required>
            <option value="">Select defect type…</option>
            {DEFECT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Customer-Reported Problem</label>
          <textarea value={form.issue} onChange={e => setForm(f=>({...f,issue:e.target.value}))}
            rows={3} placeholder="Describe what the customer reported…" className="input resize-none" required />
        </div>

        <div>
          <label className="label">Admin / Technician Root Cause Assessment</label>
          <textarea value={form.rootCause} onChange={e => setForm(f=>({...f,rootCause:e.target.value}))}
            rows={3} placeholder="Internal assessment of the root cause…" className="input resize-none" />
        </div>

        <div>
          <label className="label">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(p => (
              <button key={p.value} type="button" onClick={() => setForm(f=>({...f,priority:p.value}))}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                  form.priority === p.value ? 'text-white border-transparent' : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                }`}
                style={form.priority === p.value ? { backgroundColor: p.color, borderColor: p.color } : {}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Assignment ─────────────────── */}
      <div className="card p-5 space-y-4">
        <p className="font-bold text-ink-primary text-sm">Assignment</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Assigned Technician</label>
            <select value={form.technician} onChange={e => setForm(f=>({...f,technician:e.target.value}))}
              className="select">
              {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Target Completion Date</label>
            <input type="date" value={form.targetDate}
              onChange={e => setForm(f=>({...f,targetDate:e.target.value}))}
              min={new Date().toISOString().split('T')[0]} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Additional Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
            rows={2} className="input resize-none" placeholder="Any additional context…" />
        </div>
      </div>

      {/* ── Submit ────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="submit" disabled={!selectedJO || !form.defectType || !form.issue}
          className="btn-primary disabled:opacity-40">
          <CheckCircle2 size={15} /> Submit Back-Job
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        )}
      </div>
    </form>
  )
}
