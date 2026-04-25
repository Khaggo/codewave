'use client'

import { useState, useRef, useEffect } from 'react'
import { X, CheckCircle2, Car, ChevronDown } from 'lucide-react'
import { addVehicle } from '@/lib/vehicleStore'
import { getVehicles } from '@/lib/vehicleStore'

const VEHICLE_TYPES = ['SUV', 'Sedan', 'Pickup', 'Van', 'Hatchback', 'Crossover', 'Truck']

function getKnownOwners() {
  return [...new Set(getVehicles().map(v => v.owner).filter(Boolean))].sort()
}

function generateId() {
  return 'v' + Date.now().toString(36)
}

// ── Owner searchable input ────────────────────────────────────────────────────
function OwnerInput({ value, onChange }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState(value)
  const wrapRef              = useRef(null)
  const owners               = getKnownOwners()

  const filtered = owners.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(name) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Search or enter owner name…"
        className="input pr-8"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-surface-border bg-surface-raised shadow-card-md overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map(name => (
            <li key={name}
              className="px-4 py-2.5 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink-primary cursor-pointer transition-colors"
              onMouseDown={() => select(name)}>
              {name}
            </li>
          ))}
          {/* Allow entering a completely new name */}
          {query && !owners.includes(query) && (
            <li
              className="px-4 py-2.5 text-sm border-t border-surface-border cursor-pointer transition-colors hover:bg-surface-hover"
              style={{ color: '#f07c00' }}
              onMouseDown={() => select(query)}>
              + Add &quot;{query}&quot; as new customer
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function RegisterVehicleModal({ onClose, onRegistered }) {
  const EMPTY = { owner: '', plate: '', model: '', type: 'SUV', year: new Date().getFullYear(), mileage: 0 }
  const [form,    setForm]    = useState(EMPTY)
  const [errors,  setErrors]  = useState({})
  const [success, setSuccess] = useState(false)

  function validate() {
    const e = {}
    if (!form.owner.trim())  e.owner  = 'Owner name is required.'
    if (!form.plate.trim())  e.plate  = 'Plate number is required.'
    if (!form.model.trim())  e.model  = 'Brand & Model is required.'
    if (!form.year || form.year < 1980 || form.year > new Date().getFullYear() + 1)
      e.year = 'Enter a valid year.'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const newVehicle = {
      id:      generateId(),
      plate:   form.plate.trim().toUpperCase(),
      model:   form.model.trim(),
      type:    form.type,
      year:    Number(form.year),
      owner:   form.owner.trim(),
      color:   '',
      mileage: Number(form.mileage) || 0,
      status:  'active',
    }

    addVehicle(newVehicle)
    setSuccess(true)
    onRegistered?.(newVehicle)
  }

  function f(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => { const n = {...prev}; delete n[key]; return n })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-raised border border-surface-border rounded-2xl w-full max-w-lg shadow-card-md animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg,#f07c00,#b3541e)' }}>
                <Car size={15} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-ink-primary text-sm">Register Vehicle</p>
                <p className="text-[11px] text-ink-muted">Add a new vehicle to the system</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover transition-colors">
              <X size={17} />
            </button>
          </div>

          {success ? (
            /* Success state */
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-ink-primary">Vehicle Registered!</p>
                <p className="text-sm text-ink-secondary mt-1">
                  <span className="font-mono font-bold" style={{ color: '#f07c00' }}>
                    {form.plate.toUpperCase()}
                  </span>{' '}
                  has been added to the system.
                </p>
              </div>
              <button onClick={onClose} className="btn-primary mt-2">Done</button>
            </div>
          ) : (
            /* Form */
            <div className="p-6 space-y-4">
              {/* Owner */}
              <div>
                <label className="label">Owner Name <span className="text-red-400">*</span></label>
                <OwnerInput value={form.owner} onChange={v => f('owner', v)} />
                {errors.owner && <p className="text-xs text-red-400 mt-1">{errors.owner}</p>}
              </div>

              {/* Plate */}
              <div>
                <label className="label">Plate Number <span className="text-red-400">*</span></label>
                <input value={form.plate}
                  onChange={e => f('plate', e.target.value)}
                  placeholder="e.g. ABC-1234"
                  className="input uppercase"
                  style={{ textTransform: 'uppercase' }} />
                {errors.plate && <p className="text-xs text-red-400 mt-1">{errors.plate}</p>}
              </div>

              {/* Brand & Model */}
              <div>
                <label className="label">Brand & Model <span className="text-red-400">*</span></label>
                <input value={form.model}
                  onChange={e => f('model', e.target.value)}
                  placeholder="e.g. Toyota Fortuner" className="input" />
                {errors.model && <p className="text-xs text-red-400 mt-1">{errors.model}</p>}
              </div>

              {/* Type + Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Vehicle Type</label>
                  <select value={form.type} onChange={e => f('type', e.target.value)} className="select">
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year <span className="text-red-400">*</span></label>
                  <input type="number" value={form.year}
                    onChange={e => f('year', e.target.value)}
                    min="1980" max={new Date().getFullYear() + 1}
                    className="input" />
                  {errors.year && <p className="text-xs text-red-400 mt-1">{errors.year}</p>}
                </div>
              </div>

              {/* Mileage */}
              <div>
                <label className="label">Current Mileage (km)</label>
                <input type="number" value={form.mileage}
                  onChange={e => f('mileage', e.target.value)}
                  placeholder="0" min="0" className="input" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1 justify-center">
                  <CheckCircle2 size={14} /> Register Vehicle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
